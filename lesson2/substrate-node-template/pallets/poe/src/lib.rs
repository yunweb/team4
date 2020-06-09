#![cfg_attr(not(feature = "std"), no_std)]

/// A FRAME pallet template with necessary imports

// use sp_std::prelude::*;
use frame_support::{decl_module, decl_storage, decl_event, decl_error, dispatch, dispatch::Vec, ensure};
use frame_system::{self as system, ensure_signed};

/// The pallet's configuration trait.
pub trait Trait: system::Trait {
	// Add other types and constants required to configure this pallet.

	/// The overarching event type.
	type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;
}

// This pallet's storage items.
decl_storage! {
	// It is important to update your storage name so that your pallet's
	// storage items are isolated from other pallets.
	// ---------------------------------vvvvvvvvvvvvvv
	trait Store for Module<T: Trait> as TemplateModule {
		Proofs get(fn proofs): map hasher(blake2_128_concat) Vec<u8> => (T::AccountId, T::BlockNumber);
	}
}

// The pallet's events
decl_event!(
	pub enum Event<T> where AccountId = <T as system::Trait>::AccountId {
		ClaimCreated(AccountId, Vec<u8>),
		ClaimRevoked(AccountId, Vec<u8>),
		ClaimTransfer(AccountId, Vec<u8>, AccountId),
	}
);

// The pallet's errors
decl_error! {
	pub enum Error for Module<T: Trait> {
		ProofAlreadyExist,
		ClaimNotExist,
		NotClaimOwner,
		NotTransferToSelf,
		ClaimTooShort,
		ClaimTooLong
	}
}

// The pallet's dispatchable functions.
decl_module! {
	/// The module declaration.
	pub struct Module<T: Trait> for enum Call where origin: T::Origin {
		// Initializing errors
		// this includes information about your errors in the node's metadata.
		// it is needed only if you are using errors in your pallet
		type Error = Error<T>;

		// Initializing events
		// this is needed only if you are using events in your pallet
		fn deposit_event() = default;

		// 创建存证
		#[weight = 0]
		pub fn create_claim(origin, claim: Vec<u8>) -> dispatch::DispatchResult {
			let sender = ensure_signed(origin)?;
			const MIN_CLAIM_LEN:usize = 2;
			const MAX_CLAIM_LEN:usize = 5;

			// 存证是否超出长度限制
			ensure!(claim.len() >= MIN_CLAIM_LEN, Error::<T>::ClaimTooShort);
			ensure!(claim.len() <= MAX_CLAIM_LEN, Error::<T>::ClaimTooLong);

			ensure!(!Proofs::<T>::contains_key(&claim), Error::<T>::ProofAlreadyExist);

			Proofs::<T>::insert(&claim, (sender.clone(), system::Module::<T>::block_number()));

			Self::deposit_event(RawEvent::ClaimCreated(sender, claim));

			Ok(())
		}

		// 撤销存证
		#[weight = 0]
		pub fn revoke_claim(origin, claim: Vec<u8>) -> dispatch::DispatchResult {
			let sender = ensure_signed(origin)?;

			ensure!(Proofs::<T>::contains_key(&claim), Error::<T>::ClaimNotExist);

			let (owner, _block_number) = Proofs::<T>::get(&claim);

			ensure!(owner == sender, Error::<T>::NotClaimOwner);

			Proofs::<T>::remove(&claim);

			Self::deposit_event(RawEvent::ClaimRevoked(sender, claim));

			Ok(())
		}

		// 转移存证
		#[weight = 0]
		pub fn transfer_claim(origin, claim: Vec<u8>, receiver: T::AccountId) -> dispatch::DispatchResult {
			let sender = ensure_signed(origin)?;

			// 判断存证是否存在
			ensure!(Proofs::<T>::contains_key(&claim), Error::<T>::ClaimNotExist);

			let (owner, _block_number) = Proofs::<T>::get(&claim);

			ensure!(owner == sender, Error::<T>::NotClaimOwner);

			// 判断是否转移给自己
			ensure!(sender != receiver, Error::<T>::NotTransferToSelf);

			// 转移到新账户
			Proofs::<T>::insert(&claim, (receiver.clone(), system::Module::<T>::block_number()));

			// 发送事件
			Self::deposit_event(RawEvent::ClaimTransfer(sender, claim, receiver));

			Ok(())
		}
	}
}
