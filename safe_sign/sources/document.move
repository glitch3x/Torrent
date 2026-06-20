module safe_sign::document {
    use sui::tx_context::{Self, TxContext};
    use std::string::{Self, String};
    use sui::event;
    use std::vector;

    // =========================================================================
    //  Types
    // =========================================================================

    /// Represents a document stored on Walrus that needs signing.
    public struct Document has key {
        id: UID,
        /// Name of the document (e.g., "NDA 2024")
        name: String,
        /// The Blob ID of the encrypted PDF on Walrus
        blob_id: String,
        /// Address of the user who created the document
        creator: address,
        /// List of addresses that are authorized to sign
        signers: vector<address>,
        /// List of addresses that have already signed
        signatures: vector<address>,
    }

    // =========================================================================
    //  Events
    // =========================================================================

    public struct DocumentCreated has copy, drop {
        document_id: ID,
        name: String,
        creator: address,
    }

    public struct DocumentSigned has copy, drop {
        document_id: ID,
        signer: address,
    }

    // =========================================================================
    //  Errors
    // =========================================================================

    const ENotAuthorizedSigner: u64 = 1;
    const EAlreadySigned: u64 = 2;

    // =========================================================================
    //  Public Functions
    // =========================================================================

    /// Create a new document requiring signatures.
    public fun create_document(
        name: String,
        blob_id: String,
        signers: vector<address>,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let document = Document {
            id: object::new(ctx),
            name,
            blob_id,
            creator: sender,
            signers,
            signatures: vector::empty<address>(),
        };
        
        event::emit(DocumentCreated {
            document_id: object::id(&document),
            name: document.name,
            creator: sender,
        });

        // We share the document so any authorized signer can sign it
        transfer::share_object(document);
    }

    /// Sign a document. 
    /// The caller must be in the `signers` list and not have signed already.
    public fun sign_document(
        document: &mut Document,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        
        assert!(vector::contains(&document.signers, &sender), ENotAuthorizedSigner);
        assert!(!vector::contains(&document.signatures, &sender), EAlreadySigned);

        vector::push_back(&mut document.signatures, sender);

        event::emit(DocumentSigned {
            document_id: object::id(document),
            signer: sender,
        });
    }
}
