"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { downloadFromWalrus } from "@/lib/walrus";
import { importKey, decryptFile } from "@/lib/encryption";
import { appendAuditTrail, AuditRecord } from "@/lib/auditTrail";
import { Shield, Loader2, FileSignature, CheckCircle2, AlertTriangle, FileText, Download } from "lucide-react";

// TODO: Replace with deployed package ID
const PACKAGE_ID = "0x11960412c2d5e5978f1475fcc40a67a97835789adb9f1adfd075f7eb9d7aff39";

export default function SignDocument() {
  const params = useParams();
  const searchParams = useSearchParams();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const objectId = params.id as string;
  const searchKey = searchParams.get("key");
  
  const [encryptionKeyStr, setEncryptionKeyStr] = useState<string | null>(searchKey);
  const [manualKeyInput, setManualKeyInput] = useState("");

  const [documentData, setDocumentData] = useState<any>(null);
  const [decryptedPdfUrl, setDecryptedPdfUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "downloading" | "decrypting" | "signing" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await suiClient.getObject({
          id: objectId,
          options: { showContent: true }
        });
        
        if (res.data?.content?.dataType === "moveObject") {
          setDocumentData((res.data.content.fields as any));
          setStatus("ready");
        } else {
          throw new Error("Invalid document object");
        }
      } catch (err) {
        console.error(err);
        setStatus("error");
        setErrorMessage("Failed to fetch document metadata from Sui.");
      }
    }
    
    if (objectId) {
      fetchDoc();
    }
  }, [objectId, suiClient]);

  const handleDecryptAndSign = async () => {
    if (!documentData || !encryptionKeyStr || !account) return;

    try {
      // 1. Download from Walrus
      setStatus("downloading");
      const encryptedBuffer = await downloadFromWalrus(documentData.blob_id);

      // 2. Decrypt
      setStatus("decrypting");
      const key = await importKey(encryptionKeyStr);
      
      const decryptedBlob = await decryptFile(encryptedBuffer, key);
      
      // 3. Trigger Download of the Decrypted PDF
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${documentData.name || "Signed_Document"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus("signing");
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::document::sign_document`,
        arguments: [
          tx.object(objectId)
        ],
      });

      await signAndExecuteTransaction({
        transaction: tx,
      });

      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "Failed to sign document.");
    }
  };

  const handleDownloadFinal = async () => {
    if (!documentData || !encryptionKeyStr) return;
    setIsDownloading(true);
    try {
      const encryptedBuffer = await downloadFromWalrus(documentData.blob_id);
      const key = await importKey(encryptionKeyStr);
      const decryptedBlob = await decryptFile(encryptedBuffer, key);
      const pdfBuffer = await decryptedBlob.arrayBuffer();

      // Fetch audit trail events from Sui
      const events = await suiClient.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::document::DocumentSigned` }
      });
      
      const records: AuditRecord[] = events.data
        .filter(e => (e.parsedJson as any).document_id === objectId)
        .map(e => ({
          signerAddress: (e.parsedJson as any).signer,
          txHash: e.id.txDigest,
          timestampMs: Number(e.timestampMs)
        }));

      let finalPdfBlob = decryptedBlob;
      
      // If fully signed, append the audit trail
      if (documentData.signatures?.length === documentData.signers?.length) {
        finalPdfBlob = await appendAuditTrail(pdfBuffer, objectId, records);
      }
      
      const url = URL.createObjectURL(finalPdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${documentData.name || "Signed_Document"}_AUDIT.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsDownloading(false);
    } catch (err: any) {
      console.error(err);
      setIsDownloading(false);
      setStatus("error");
      setErrorMessage(err.message || "Failed to download final document.");
    }
  };

  const isSigner = account && documentData?.signers?.includes(account.address);
  const hasSigned = account && documentData?.signatures?.includes(account.address);

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] text-slate-900 relative font-sans">
      <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] bg-[#6366f1]/10 rounded-full blur-[150px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      
      <Navbar />
      
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-20 relative z-10">
        {status === "loading" ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 text-[#6366f1] animate-spin" />
            <p className="text-slate-500 animate-pulse font-medium">Fetching document metadata from Sui...</p>
          </div>
        ) : status === "error" ? (
          <div className="p-12 rounded-3xl border border-red-200 bg-red-50 text-center shadow-xl shadow-slate-200/50 max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Error Loading Document</h3>
            <p className="text-red-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-xl font-bold transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Document Info Card */}
            <div className="p-10 rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-8 h-8 text-[#6366f1]" />
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{documentData?.name}</h2>
                </div>
                <p className="text-slate-600">Review the document details and sign cryptographically using your connected wallet.</p>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Document ID (Sui)</label>
                  <p className="font-mono text-sm text-slate-700 break-all bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {objectId}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Storage Reference (Walrus)</label>
                  <p className="font-mono text-sm text-slate-700 break-all bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {documentData?.blob_id}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">Signature Status</label>
                <div className="space-y-3">
                  {documentData?.signers?.map((signerAddr: string) => {
                    const signed = documentData.signatures?.includes(signerAddr);
                    return (
                      <div key={signerAddr} className={`flex items-center justify-between p-4 rounded-xl border ${signed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                          {signed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Loader2 className="w-5 h-5 text-slate-400" />}
                          <span className="font-mono text-sm text-slate-700">
                            {signerAddr.slice(0, 6)}...{signerAddr.slice(-4)}
                          </span>
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${signed ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {signed ? 'Signed' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Card */}
            <div className="p-10 rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center text-center min-h-[400px]">
              
              {!account ? (
                <>
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Wallet Disconnected</h3>
                  <p className="text-slate-600 max-w-sm mb-8">You must connect the authorized Sui wallet to view and sign this document.</p>
                </>
              ) : !isSigner ? (
                <>
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Unauthorized</h3>
                  <p className="text-red-600 max-w-sm mb-8">The connected wallet is not authorized to sign this document.</p>
                </>
              ) : hasSigned ? (
                <>
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-3">You've Signed!</h3>
                  <p className="text-emerald-600 max-w-sm mb-8">Your cryptographic signature has been recorded immutably on the Sui blockchain.</p>
                  
                  {encryptionKeyStr && (
                    <button 
                      onClick={handleDownloadFinal}
                      disabled={isDownloading}
                      className="w-full py-4 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                      {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                      Download Document {documentData?.signatures?.length === documentData?.signers?.length ? "w/ Audit Trail" : ""}
                    </button>
                  )}
                </>
              ) : status === "success" ? (
                <>
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-3">Signature Confirmed</h3>
                  <p className="text-emerald-600 max-w-sm mb-8">Transaction successful. The document state has been updated.</p>
                  
                  {encryptionKeyStr && (
                    <button 
                      onClick={handleDownloadFinal}
                      disabled={isDownloading}
                      className="w-full py-4 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                      {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                      Download Document {documentData?.signatures?.length === documentData?.signers?.length ? "w/ Audit Trail" : ""}
                    </button>
                  )}
                </>
              ) : !encryptionKeyStr ? (
                <>
                  <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Missing Decryption Key</h3>
                  <p className="text-amber-600 max-w-sm mb-6">You need the secure decryption key to decrypt and sign this document.</p>
                  
                  <div className="w-full text-left">
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Paste Decryption Key</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={manualKeyInput}
                        onChange={(e) => setManualKeyInput(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                        placeholder="e.g. jwKk_1..."
                      />
                      <button 
                        onClick={() => {
                          if (manualKeyInput.trim()) {
                            setEncryptionKeyStr(manualKeyInput.trim());
                            // Optionally update the URL so they can refresh
                            const url = new URL(window.location.href);
                            url.searchParams.set("key", manualKeyInput.trim());
                            window.history.pushState({}, '', url.toString());
                          }
                        }}
                        className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors shadow-sm"
                      >
                        Unlock
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 bg-[#6366f1]/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                    <FileSignature className="w-12 h-12 text-[#6366f1]" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-4">Ready to Sign</h3>
                  <p className="text-slate-600 max-w-sm mb-10">We will download the encrypted blob from Walrus, decrypt it locally, and prompt your wallet for the final signature.</p>
                  
                  <button 
                    onClick={handleDecryptAndSign}
                    disabled={status !== "ready"}
                    className="w-full py-5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-lg shadow-lg shadow-indigo-500/25 disabled:shadow-none"
                  >
                    {status === "downloading" && <><Loader2 className="w-6 h-6 animate-spin" /> Fetching from Walrus...</>}
                    {status === "decrypting" && <><Loader2 className="w-6 h-6 animate-spin" /> Decrypting PDF...</>}
                    {status === "signing" && <><Loader2 className="w-6 h-6 animate-spin" /> Approve in Wallet...</>}
                    {status === "ready" && <><Shield className="w-6 h-6" /> Decrypt & Sign Now</>}
                  </button>
                </>
              )}

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
