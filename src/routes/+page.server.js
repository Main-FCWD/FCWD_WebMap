import { supabase } from "$lib/supabase";

export const load = async () => {
	const { data: GPS, error } = await supabase
    .from('GPS')
    .select();
	if (!GPS) throw error;
		
  console.log("Ran layout load");
  return {
    data: await GPS,
	GPS: GPS ?? [], 
};

};
