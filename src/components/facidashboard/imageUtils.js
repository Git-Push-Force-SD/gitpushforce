export const getImageUrl = (listing) => {
  if (!listing?.image_path) return null;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/Listings/${listing.image_path}`;
};
