-- Uploads to contest-images and payment-qr-codes must go to the uploader's own
-- folder and a contest they own. File path structure: {user_id}/{contest_id}/{filename}
-- Inside the EXISTS subquery an unqualified "name" would resolve to contests.name,
-- so the object path is always written as objects.name.
-- DELETE and public SELECT policies are unchanged.

-- contest-images
DROP POLICY IF EXISTS "Users can upload contest images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own contest images" ON storage.objects;

CREATE POLICY "Users can upload contest images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contest-images'
  AND split_part(objects.name, '/', 1) = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contests
    WHERE public.contests.id::text = split_part(objects.name, '/', 2)
      AND public.contests.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own contest images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contest-images'
  AND split_part(objects.name, '/', 1) = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contests
    WHERE public.contests.id::text = split_part(objects.name, '/', 2)
      AND public.contests.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'contest-images'
  AND split_part(objects.name, '/', 1) = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contests
    WHERE public.contests.id::text = split_part(objects.name, '/', 2)
      AND public.contests.owner_id = auth.uid()
  )
);

-- payment-qr-codes
DROP POLICY IF EXISTS "Contest owners can upload payment QR codes" ON storage.objects;
DROP POLICY IF EXISTS "Contest owners can update payment QR codes" ON storage.objects;

CREATE POLICY "Contest owners can upload payment QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-qr-codes'
  AND split_part(objects.name, '/', 1) = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contests
    WHERE public.contests.id::text = split_part(objects.name, '/', 2)
      AND public.contests.owner_id = auth.uid()
  )
);

CREATE POLICY "Contest owners can update payment QR codes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-qr-codes'
  AND split_part(objects.name, '/', 1) = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contests
    WHERE public.contests.id::text = split_part(objects.name, '/', 2)
      AND public.contests.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'payment-qr-codes'
  AND split_part(objects.name, '/', 1) = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contests
    WHERE public.contests.id::text = split_part(objects.name, '/', 2)
      AND public.contests.owner_id = auth.uid()
  )
);

-- contest-images: 5 MB, images only (matches uploadContestImage)
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = '{image/jpeg,image/png,image/webp,image/gif}'
WHERE id = 'contest-images';
