update public.pet_item_definitions
set cost = 5,
    satiety_gain = 14,
    happiness_gain = 0,
    cleanliness_gain = 0
where id = 'parrot-food';

update public.pet_item_definitions
set cost = 8,
    satiety_gain = 10,
    happiness_gain = 10,
    cleanliness_gain = 0
where id = 'apple-bites';

update public.pet_item_definitions
set cost = 40,
    satiety_gain = 0,
    happiness_gain = 15,
    cleanliness_gain = 0
where id = 'bell-toy';

update public.pet_item_definitions
set cost = 8,
    satiety_gain = 0,
    happiness_gain = 0,
    cleanliness_gain = 12
where id = 'bath-spray';
