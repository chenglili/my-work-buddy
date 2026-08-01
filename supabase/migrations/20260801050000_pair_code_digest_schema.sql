alter function public.create_pair_code(uuid, text)
  set search_path = public, auth, extensions;

alter function public.claim_pair_code(uuid, text, text)
  set search_path = public, auth, extensions;
