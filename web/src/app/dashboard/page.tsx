"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useEffect } from "react";
import { encryptFile, generateKey, exportKey } from "@/lib/encryption";
import { uploadToWalrus } from "@/lib/walrus";
import { FileUp, Shield, CheckCircle2, Loader2, KeyRound, Database, FileSignature } from "lucide-react";
import Link from "next/link";

// TODO: Replace with deployed package ID
const PACKAGE_ID = "0x11960412c2d5e5978f1475fcc40a67a97835789adb9f1adfd075f7eb9d7aff39";

export default function Dashboard() {
  const account = useCurrentAccount();
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [signers, setSigners] = useState("");
  const [status, setStatus] = useState<"idle" | "encrypting" | "uploading" | "signing" | "success">("idle");
  const [encryptionKey, setEncryptionKey] = useState<string>("");
  const [blobId, setBlobId] = useState<string>("");
  const [objectId, setObjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"create" | "documents">("create");
  const [myDocuments, setMyDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [signerEmails, setSignerEmails] = useState("");

  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  useEffect(() => {
    if (!account || activeTab !== "documents") return;
    async function loadDocs() {
      setLoadingDocs(true);
      try {
        const events = await suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::document::DocumentCreated` },
          limit: 50,
          order: "descending"
        });

        const docIds = events.data.map(e => (e.parsedJson as any).document_id);
        
        if (docIds.length > 0) {
          const objs = await suiClient.multiGetObjects({
            ids: docIds,
            options: { showContent: true }
          });
          
          const relevantDocs = objs
            .filter(obj => obj.data?.content?.dataType === "moveObject")
            .map(obj => {
              const fields = (obj.data as any).content.fields;
              return {
                ...fields,
                id: (obj.data as any).objectId
              };
            })
            .filter(doc => 
              doc.creator === account.address || 
              (doc.signers && doc.signers.includes(account.address))
            );
            
          setMyDocuments(relevantDocs);
        }
      } catch (err) {
        console.error("Failed to load documents", err);
      }
      setLoadingDocs(false);
    }
    loadDocs();
  }, [account, suiClient, activeTab]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !documentName || !signers || !account) return;

    try {
      setStatus("encrypting");
      const key = await generateKey();
      const exportedKey = await exportKey(key);
      setEncryptionKey(exportedKey);
      
      const ciphertext = await encryptFile(file, key);

      setStatus("uploading");
      const walrusBlobId = await uploadToWalrus(ciphertext);
      setBlobId(walrusBlobId);

      setStatus("signing");
      const tx = new Transaction();
      tx.setSender(account.address);
      
      const signerAddresses = signers
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);
        
      for (const addr of signerAddresses) {
        if (!addr.startsWith("0x") || addr.length !== 66) {
          throw new Error(`Invalid Sui address provided: ${addr}. Addresses must be 66 characters starting with 0x.`);
        }
      }
      
      tx.moveCall({
        target: `${PACKAGE_ID}::document::create_document`,
        arguments: [
          tx.pure.string(documentName),
          tx.pure.string(walrusBlobId),
          tx.pure.vector("address", signerAddresses),
        ],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
        options: { showEffects: true, showObjectChanges: true }
      });
      
      const createdObj = result.objectChanges?.find(
        (change) => change.type === "created" && change.objectType.includes("::document::Document")
      );
      
      if (createdObj && 'objectId' in createdObj) {
        setObjectId(createdObj.objectId);
        
        // Feature 2: Trigger automated email routing if emails were provided
        if (signerEmails) {
          try {
            await fetch("/api/send-invites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                documentName,
                objectId: createdObj.objectId,
                aesKey: exportedKey,
                emails: signerEmails.split(",").map(e => e.trim()).filter(e => e.length > 0)
              })
            });
          } catch (e) {
            console.error("Failed to send invite emails", e);
          }
        }
      } else if (result.effects?.created && result.effects.created.length > 0) {
        setObjectId(result.effects.created[0].reference.objectId);
      }

      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setStatus("idle");
      
      const errorMessage = err?.message || "An unknown error occurred.";
      alert(`Error: ${errorMessage}\n\nPlease check the console for more details.`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] text-slate-900 relative font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <Navbar />
      
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">Dashboard</h2>
            <p className="text-lg text-slate-600 font-medium">Create secure documents or view ones requiring your signature.</p>
          </div>
          <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab("create")}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "create" ? "bg-white text-[#6366f1] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Create Document
            </button>
            <button 
              onClick={() => setActiveTab("documents")}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "documents" ? "bg-white text-[#6366f1] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              My Documents
            </button>
          </div>
        </div>

        {!account ? (
          <div className="p-12 rounded-3xl border border-slate-200 bg-white text-center shadow-xl shadow-slate-200/50">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Connect Your Wallet</h3>
            <p className="text-slate-600 max-w-md mx-auto">Please connect your Sui wallet using the button in the navigation bar to start creating secure documents.</p>
          </div>
        ) : status === "success" ? (
          <div className="p-10 rounded-3xl border border-emerald-500/20 bg-emerald-50 shadow-xl shadow-slate-200/50 space-y-8">
            <div className="text-center">
              <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6 shadow-lg shadow-emerald-500/20 rounded-full bg-white" />
              <h3 className="text-3xl font-bold text-slate-900 mb-2">Secured & Published</h3>
              <p className="text-emerald-700">Your document is fully encrypted and awaiting signatures.</p>
            </div>
            
            <div className="grid gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4">
                <Database className="w-6 h-6 text-[#6366f1] shrink-0 mt-1" />
                <div className="overflow-hidden">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Walrus Blob ID</label>
                  <p className="font-mono text-sm text-slate-700 truncate">{blobId}</p>
                </div>
              </div>

              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex items-start gap-4">
                <KeyRound className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                <div className="overflow-hidden">
                  <label className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1 block">Decryption Key (CRITICAL)</label>
                  <p className="font-mono text-sm text-amber-800 break-all">{encryptionKey}</p>
                  <p className="text-xs text-amber-600 mt-3 font-medium">Save this key now! Share it securely with your signers. We do not store this key.</p>
                </div>
              </div>

              {objectId && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-4 overflow-hidden">
                    <FileSignature className="w-6 h-6 text-emerald-500 shrink-0 mt-1" />
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Sui Object ID</label>
                      <p className="font-mono text-sm text-slate-700 truncate">{objectId}</p>
                    </div>
                  </div>
                  <Link 
                    href={`/sign/${objectId}?key=${encodeURIComponent(encryptionKey)}`}
                    className="shrink-0 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold rounded-xl transition-colors"
                  >
                    View Document
                  </Link>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-slate-200 flex justify-center">
              <button 
                onClick={() => {
                  setStatus("idle");
                  setFile(null);
                  setDocumentName("");
                  setSigners("");
                  setSignerEmails("");
                  setObjectId("");
                }}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors w-full sm:w-auto"
              >
                Create Another Document
              </button>
            </div>
          </div>
        ) : activeTab === "documents" ? (
          <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Your Documents</h3>
            {loadingDocs ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-10 h-10 text-[#6366f1] animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Syncing with Sui Blockchain...</p>
              </div>
            ) : myDocuments.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
                <FileSignature className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No documents found for this wallet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myDocuments.map((doc: any, i) => {
                  const isCreator = doc.creator === account.address;
                  const hasSigned = doc.signatures?.includes(account.address);
                  const fullySigned = doc.signatures?.length === doc.signers?.length;
                  
                  return (
                    <div key={i} className="flex items-center justify-between p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${fullySigned ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                          {fullySigned ? <CheckCircle2 className="w-6 h-6" /> : <FileSignature className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-lg">{doc.name}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{doc.signatures?.length || 0} / {doc.signers?.length || 0} Signed</span>
                            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${isCreator ? 'bg-slate-200 text-slate-700' : hasSigned ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                              {isCreator ? 'Creator' : hasSigned ? 'You Signed' : 'Action Required'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link 
                        href={`/sign/${doc.id}`}
                        className="px-6 py-3 bg-white border border-slate-200 group-hover:border-indigo-200 text-slate-900 rounded-xl font-bold transition-all shadow-sm group-hover:shadow-md"
                      >
                        View
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleUpload} className="space-y-8 bg-white p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#6366f1]/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 space-y-8">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">Document Title</label>
                <input 
                  type="text" 
                  required
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-[#6366f1] focus:border-transparent outline-none transition-all text-lg font-medium placeholder:text-slate-400"
                  placeholder="e.g. Q4 Master Service Agreement"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">Authorized Signers</label>
                <input 
                  type="text" 
                  required
                  value={signers}
                  onChange={(e) => setSigners(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-[#6366f1] focus:border-transparent outline-none transition-all font-mono text-sm placeholder:text-slate-400 placeholder:font-sans"
                  placeholder="Comma-separated Sui addresses (0x123..., 0x456...)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">Signer Emails (Optional - For Auto Invites)</label>
                <input 
                  type="text" 
                  value={signerEmails}
                  onChange={(e) => setSignerEmails(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-[#6366f1] focus:border-transparent outline-none transition-all font-sans text-sm placeholder:text-slate-400"
                  placeholder="Comma-separated emails corresponding to the signers above"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">Upload PDF</label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:border-[#6366f1]/50 hover:bg-[#6366f1]/5 transition-all bg-slate-50 relative group">
                  <input 
                    type="file" 
                    accept="application/pdf"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 border border-slate-100 group-hover:bg-[#6366f1]/10 group-hover:border-transparent transition-all shadow-sm">
                    <FileUp className="w-8 h-8 text-slate-400 group-hover:text-[#6366f1] transition-colors" />
                  </div>
                  <p className="text-slate-900 font-bold text-lg mb-2">
                    {file ? file.name : "Click or drag PDF here"}
                  </p>
                  <p className="text-slate-500 text-sm">File will be encrypted locally using AES-GCM</p>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={status !== "idle" || !file || !documentName || !signers}
                className="w-full py-5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-lg shadow-lg shadow-indigo-500/25 disabled:shadow-none"
              >
                {status === "encrypting" && <><Loader2 className="w-6 h-6 animate-spin" /> Encrypting Locally...</>}
                {status === "uploading" && <><Loader2 className="w-6 h-6 animate-spin" /> Pushing to Walrus...</>}
                {status === "signing" && <><Loader2 className="w-6 h-6 animate-spin" /> Approve in Wallet...</>}
                {status === "idle" && <><Shield className="w-6 h-6" /> Secure & Publish Document</>}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
