// ============================================================================
// JS/CONFIG.JS — Config statica app (categorie POI, città)
// Phase 1 — caricato prima di state.js
// ============================================================================

// ── POI categories (label + icon) — used by map, filter bar, views ──────────
window.CATS = {
  all:{label:'Tutti',icon:'📍'},poi:{label:'Luoghi',icon:'📍'},unclassified:{label:'Da categorizzare',icon:'❓'},
  shrine:{label:'Santuari',icon:'⛩️'},temple:{label:'Templi',icon:'🏯'},church:{label:'Chiese',icon:'⛪'},
  mosque:{label:'Moschee',icon:'🕌'},synagogue:{label:'Sinagoghe',icon:'🕍'},culture:{label:'Cultura',icon:'🎨'},
  museum:{label:'Musei',icon:'🏛️'},gallery:{label:'Gallerie',icon:'🖼️'},library:{label:'Librerie',icon:'📚'},
  landmark:{label:'Landmark',icon:'📍'},monument:{label:'Monumenti',icon:'🗿'},historical_landmark:{label:'Siti storici',icon:'🏛️'},
  castle:{label:'Castelli',icon:'🏰'},food:{label:'Cibo',icon:'🍽️'},restaurant:{label:'Ristoranti',icon:'🍜'},
  cafe:{label:'Caffè',icon:'☕'},bar:{label:'Bar',icon:'🍷'},bakery:{label:'Panetterie',icon:'🥐'},
  meal_delivery:{label:'Consegna cibo',icon:'🛵'},meal_takeaway:{label:'Asporto',icon:'📦'},
  drinking_bar:{label:'Locali',icon:'🍺'},market:{label:'Mercati',icon:'🥢'},
  hotel:{label:'Hotel',icon:'🏨'},accommodation:{label:'Alloggi',icon:'🏩'},hostel:{label:'Ostelli',icon:'🏠'},
  guest_house:{label:'Guest house',icon:'🏡'},campground:{label:'Campeggi',icon:'⛺'},apartment_building:{label:'Appartamenti',icon:'🏢'},
  shopping:{label:'Shopping',icon:'🛍️'},shop:{label:'Negozi',icon:'🛒'},supermarket:{label:'Supermercati',icon:'🏪'},
  shopping_mall:{label:'Center',icon:'🏬'},department_store:{label:'Grandi magazzini',icon:'🏬'},
  clothing_store:{label:'Abbigliamento',icon:'👕'},shoe_store:{label:'Scarpe',icon:'👞'},book_store:{label:'Librerie',icon:'📖'},
  electronics_store:{label:'Elettronica',icon:'⚡'},jewelry_store:{label:'Gioiellerie',icon:'💎'},
  furniture_store:{label:'Arredamento',icon:'🛋️'},home_goods_store:{label:'Casa',icon:'🏠'},
  pharmacy:{label:'Farmacie',icon:'💊'},convenience_store:{label:'Convenience',icon:'🏪'},florist:{label:'Fioristi',icon:'🌸'},
  toy_store:{label:'Giocattoli',icon:'🧸'},vintage:{label:'Vintage',icon:'🧥'},
  nature:{label:'Natura',icon:'🌿'},park:{label:'Parchi',icon:'🌳'},natural_feature:{label:'Natura selvaggia',icon:'🌲'},
  garden:{label:'Giardini',icon:'🌸'},zoo:{label:'Zoo',icon:'🦁'},aquarium:{label:'Acquari',icon:'🐠'},
  botanical_garden:{label:'Orti botanici',icon:'🌺'},amusement_park:{label:'Parchi divertimento',icon:'🎡'},
  hiking_area:{label:'Sentieri',icon:'⛰️'},scenic_spot:{label:'Belvedere',icon:'🔭'},water:{label:'Acqua gratis',icon:'💧'},
  wellness:{label:'Benessere',icon:'🧘'},spa:{label:'Spa',icon:'💆'},gym:{label:'Palestre',icon:'💪'},yoga_studio:{label:'Yoga',icon:'🧘'},
  health:{label:'Salute',icon:'⚕️'},hospital:{label:'Ospedali',icon:'🏥'},clinic:{label:'Cliniche',icon:'🏥'},
  doctor:{label:'Medici',icon:'⚕️'},dentist:{label:'Dentisti',icon:'🦷'},massage:{label:'Massaggio',icon:'💆'},
  physiotherapist:{label:'Fisioterapia',icon:'🤕'},beauty_salon:{label:'Saloni bellezza',icon:'💄'},hair_care:{label:'Parrucchieri',icon:'💇'},
  services:{label:'Servizi',icon:'🔧'},bank:{label:'Banche',icon:'🏦'},atm:{label:'Bancomat',icon:'💰'},
  post_office:{label:'Poste',icon:'📮'},real_estate_agency:{label:'Immobiliare',icon:'🏠'},travel_agency:{label:'Agenzie viaggio',icon:'✈️'},
  insurance_agency:{label:'Assicurazioni',icon:'🛡️'},accounting:{label:'Contabilità',icon:'📊'},attorney:{label:'Avvocati',icon:'⚖️'},
  car_rental:{label:'Noleggio auto',icon:'🚗'},car_repair:{label:'Meccanica',icon:'🔧'},car_wash:{label:'Lavaggio auto',icon:'🚗'},
  locksmith:{label:'Serrature',icon:'🔐'},plumber:{label:'Idraulica',icon:'🔨'},electrician:{label:'Elettricità',icon:'⚡'},
  business_center:{label:'Business center',icon:'💼'},internet_cafe:{label:'Internet cafe',icon:'☕'},
  laundry:{label:'Lavanderie',icon:'👔'},dry_cleaner:{label:'Tintorie',icon:'👔'},
  experience:{label:'Esperienze',icon:'✨'},onsen:{label:'Onsen',icon:'♨️'},bath:{label:'Bagni',icon:'🛁'},
  entertainment:{label:'Intrattenimento',icon:'🎭'},theatre:{label:'Teatri',icon:'🎭'},movie_theater:{label:'Cinema',icon:'🎬'},
  sports:{label:'Sport',icon:'⚽'},school:{label:'Scuole',icon:'🎓'},transport:{label:'Trasporti',icon:'🚆'},
  station:{label:'Stazioni',icon:'🚉'},train_station:{label:'Stazioni treni',icon:'🚂'},bus_station:{label:'Stazioni bus',icon:'🚌'},
  airport:{label:'Aeroporti',icon:'✈️'},parking:{label:'Parcheggi',icon:'🅿️'},taxi_stand:{label:'Taxi',icon:'🚕'},
  bike_rental:{label:'Bike sharing',icon:'🚲'},gas_station:{label:'Stazioni benzina',icon:'⛽'},
  neighborhood:{label:'Quartieri',icon:'🏘️'},viewpoint:{label:'Viste',icon:'🔭'},establishment:{label:'Strutture',icon:'🏢'},
  place_of_worship:{label:'Luoghi di culto',icon:'⛩️'}
};

// ── City list + coordinates (lat/lng) ─────────────────────────────────────────
window.CITIES = ['Sapporo','Nikko','Tokyo','Kamakura','Shirakawa-go','Kyoto','Osaka','Tottori','Beppu','Okinawa','Hiroshima','Nara','Hakone','Kanazawa','Nagasaki','Fukuoka','Matsuyama','Naoshima','Yakushima','Takayama','Kumamoto','Kagoshima','Sendai','Aomori','Toyama','Tokushima','Yamaguchi','Shimane','Ise','Gifu','Nagano','Fuji','Izu','Nagoya','Takamatsu','Kobe','Yokohama'];
window.CITY_COORDS = {
  Sapporo:[43.06,141.35],Nikko:[36.75,139.60],Tokyo:[35.68,139.76],Kamakura:[35.32,139.55],
  'Shirakawa-go':[36.26,136.91],Kyoto:[35.01,135.77],Osaka:[34.68,135.50],Tottori:[35.50,134.23],
  Beppu:[33.30,131.50],Okinawa:[26.20,127.69],Hiroshima:[34.39,132.45],Nara:[34.68,135.83],
  Hakone:[35.23,139.03],Kanazawa:[36.56,136.66],Nagasaki:[32.74,129.87],Fukuoka:[33.59,130.40],
  Matsuyama:[33.84,132.77],Naoshima:[34.46,133.99],Yakushima:[30.33,130.55],Takayama:[36.14,137.25],
  Kumamoto:[32.80,130.71],Kagoshima:[31.59,130.56],Sendai:[38.27,140.87],Aomori:[40.82,140.75],
  Toyama:[36.70,137.21],Tokushima:[34.07,134.55],Yamaguchi:[34.18,131.47],Shimane:[35.47,133.05],
  Ise:[34.49,136.71],Gifu:[35.42,136.76],Nagano:[36.65,138.19],Fuji:[35.36,138.73],
  Izu:[34.97,138.95],Nagoya:[35.18,136.91],Takamatsu:[34.34,134.04],Kobe:[34.69,135.19],
  Yokohama:[35.45,139.64],Akita:[39.72,140.10]
};
