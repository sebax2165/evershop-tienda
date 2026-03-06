export interface Province {
  code: string;
  name: string;
}

export interface Country {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  phonePrefix: string;
  provinces: Province[];
}

export const LATAM_COUNTRIES: Country[] = [
  {
    code: 'CO',
    name: 'Colombia',
    currency: 'COP',
    currencySymbol: '$',
    phonePrefix: '+57',
    provinces: [
      { code: 'CO-AMA', name: 'Amazonas' },
      { code: 'CO-ANT', name: 'Antioquia' },
      { code: 'CO-ARA', name: 'Arauca' },
      { code: 'CO-ATL', name: 'Atlantico' },
      { code: 'CO-BOL', name: 'Bolivar' },
      { code: 'CO-BOY', name: 'Boyaca' },
      { code: 'CO-CAL', name: 'Caldas' },
      { code: 'CO-CAQ', name: 'Caqueta' },
      { code: 'CO-CAS', name: 'Casanare' },
      { code: 'CO-CAU', name: 'Cauca' },
      { code: 'CO-CES', name: 'Cesar' },
      { code: 'CO-CHO', name: 'Choco' },
      { code: 'CO-COR', name: 'Cordoba' },
      { code: 'CO-CUN', name: 'Cundinamarca' },
      { code: 'CO-DC', name: 'Bogota D.C.' },
      { code: 'CO-GUA', name: 'Guainia' },
      { code: 'CO-GUV', name: 'Guaviare' },
      { code: 'CO-HUI', name: 'Huila' },
      { code: 'CO-LAG', name: 'La Guajira' },
      { code: 'CO-MAG', name: 'Magdalena' },
      { code: 'CO-MET', name: 'Meta' },
      { code: 'CO-NAR', name: 'Narino' },
      { code: 'CO-NSA', name: 'Norte de Santander' },
      { code: 'CO-PUT', name: 'Putumayo' },
      { code: 'CO-QUI', name: 'Quindio' },
      { code: 'CO-RIS', name: 'Risaralda' },
      { code: 'CO-SAN', name: 'Santander' },
      { code: 'CO-SAP', name: 'San Andres y Providencia' },
      { code: 'CO-SUC', name: 'Sucre' },
      { code: 'CO-TOL', name: 'Tolima' },
      { code: 'CO-VAC', name: 'Valle del Cauca' },
      { code: 'CO-VAU', name: 'Vaupes' },
      { code: 'CO-VID', name: 'Vichada' }
    ]
  },
  {
    code: 'MX',
    name: 'Mexico',
    currency: 'MXN',
    currencySymbol: '$',
    phonePrefix: '+52',
    provinces: [
      { code: 'MX-AGU', name: 'Aguascalientes' },
      { code: 'MX-BCN', name: 'Baja California' },
      { code: 'MX-BCS', name: 'Baja California Sur' },
      { code: 'MX-CAM', name: 'Campeche' },
      { code: 'MX-CHP', name: 'Chiapas' },
      { code: 'MX-CHH', name: 'Chihuahua' },
      { code: 'MX-CMX', name: 'Ciudad de Mexico' },
      { code: 'MX-COA', name: 'Coahuila' },
      { code: 'MX-COL', name: 'Colima' },
      { code: 'MX-DUR', name: 'Durango' },
      { code: 'MX-GUA', name: 'Guanajuato' },
      { code: 'MX-GRO', name: 'Guerrero' },
      { code: 'MX-HID', name: 'Hidalgo' },
      { code: 'MX-JAL', name: 'Jalisco' },
      { code: 'MX-MEX', name: 'Estado de Mexico' },
      { code: 'MX-MIC', name: 'Michoacan' },
      { code: 'MX-MOR', name: 'Morelos' },
      { code: 'MX-NAY', name: 'Nayarit' },
      { code: 'MX-NLE', name: 'Nuevo Leon' },
      { code: 'MX-OAX', name: 'Oaxaca' },
      { code: 'MX-PUE', name: 'Puebla' },
      { code: 'MX-QUE', name: 'Queretaro' },
      { code: 'MX-ROO', name: 'Quintana Roo' },
      { code: 'MX-SLP', name: 'San Luis Potosi' },
      { code: 'MX-SIN', name: 'Sinaloa' },
      { code: 'MX-SON', name: 'Sonora' },
      { code: 'MX-TAB', name: 'Tabasco' },
      { code: 'MX-TAM', name: 'Tamaulipas' },
      { code: 'MX-TLA', name: 'Tlaxcala' },
      { code: 'MX-VER', name: 'Veracruz' },
      { code: 'MX-YUC', name: 'Yucatan' },
      { code: 'MX-ZAC', name: 'Zacatecas' }
    ]
  },
  {
    code: 'CL',
    name: 'Chile',
    currency: 'CLP',
    currencySymbol: '$',
    phonePrefix: '+56',
    provinces: [
      { code: 'CL-AP', name: 'Arica y Parinacota' },
      { code: 'CL-TA', name: 'Tarapaca' },
      { code: 'CL-AN', name: 'Antofagasta' },
      { code: 'CL-AT', name: 'Atacama' },
      { code: 'CL-CO', name: 'Coquimbo' },
      { code: 'CL-VS', name: 'Valparaiso' },
      { code: 'CL-RM', name: 'Region Metropolitana de Santiago' },
      { code: 'CL-LI', name: "O'Higgins" },
      { code: 'CL-ML', name: 'Maule' },
      { code: 'CL-NB', name: 'Nuble' },
      { code: 'CL-BI', name: 'Biobio' },
      { code: 'CL-AR', name: 'La Araucania' },
      { code: 'CL-LR', name: 'Los Rios' },
      { code: 'CL-LL', name: 'Los Lagos' },
      { code: 'CL-AI', name: 'Aysen' },
      { code: 'CL-MA', name: 'Magallanes' }
    ]
  },
  {
    code: 'EC',
    name: 'Ecuador',
    currency: 'USD',
    currencySymbol: '$',
    phonePrefix: '+593',
    provinces: [
      { code: 'EC-A', name: 'Azuay' },
      { code: 'EC-B', name: 'Bolivar' },
      { code: 'EC-F', name: 'Canar' },
      { code: 'EC-C', name: 'Carchi' },
      { code: 'EC-H', name: 'Chimborazo' },
      { code: 'EC-X', name: 'Cotopaxi' },
      { code: 'EC-O', name: 'El Oro' },
      { code: 'EC-E', name: 'Esmeraldas' },
      { code: 'EC-W', name: 'Galapagos' },
      { code: 'EC-G', name: 'Guayas' },
      { code: 'EC-I', name: 'Imbabura' },
      { code: 'EC-L', name: 'Loja' },
      { code: 'EC-R', name: 'Los Rios' },
      { code: 'EC-M', name: 'Manabi' },
      { code: 'EC-S', name: 'Morona Santiago' },
      { code: 'EC-N', name: 'Napo' },
      { code: 'EC-D', name: 'Orellana' },
      { code: 'EC-Y', name: 'Pastaza' },
      { code: 'EC-P', name: 'Pichincha' },
      { code: 'EC-SE', name: 'Santa Elena' },
      { code: 'EC-SD', name: 'Santo Domingo de los Tsachilas' },
      { code: 'EC-U', name: 'Sucumbios' },
      { code: 'EC-T', name: 'Tungurahua' },
      { code: 'EC-Z', name: 'Zamora Chinchipe' }
    ]
  },
  {
    code: 'PE',
    name: 'Peru',
    currency: 'PEN',
    currencySymbol: 'S/',
    phonePrefix: '+51',
    provinces: [
      { code: 'PE-AMA', name: 'Amazonas' },
      { code: 'PE-ANC', name: 'Ancash' },
      { code: 'PE-APU', name: 'Apurimac' },
      { code: 'PE-ARE', name: 'Arequipa' },
      { code: 'PE-AYA', name: 'Ayacucho' },
      { code: 'PE-CAJ', name: 'Cajamarca' },
      { code: 'PE-CUS', name: 'Cusco' },
      { code: 'PE-CAL', name: 'Callao' },
      { code: 'PE-HUV', name: 'Huancavelica' },
      { code: 'PE-HUC', name: 'Huanuco' },
      { code: 'PE-ICA', name: 'Ica' },
      { code: 'PE-JUN', name: 'Junin' },
      { code: 'PE-LAL', name: 'La Libertad' },
      { code: 'PE-LAM', name: 'Lambayeque' },
      { code: 'PE-LIM', name: 'Lima' },
      { code: 'PE-LOR', name: 'Loreto' },
      { code: 'PE-MDD', name: 'Madre de Dios' },
      { code: 'PE-MOQ', name: 'Moquegua' },
      { code: 'PE-PAS', name: 'Pasco' },
      { code: 'PE-PIU', name: 'Piura' },
      { code: 'PE-PUN', name: 'Puno' },
      { code: 'PE-SAM', name: 'San Martin' },
      { code: 'PE-TAC', name: 'Tacna' },
      { code: 'PE-TUM', name: 'Tumbes' },
      { code: 'PE-UCA', name: 'Ucayali' }
    ]
  },
  {
    code: 'AR',
    name: 'Argentina',
    currency: 'ARS',
    currencySymbol: '$',
    phonePrefix: '+54',
    provinces: [
      { code: 'AR-B', name: 'Buenos Aires' },
      { code: 'AR-C', name: 'Ciudad Autonoma de Buenos Aires' },
      { code: 'AR-K', name: 'Catamarca' },
      { code: 'AR-H', name: 'Chaco' },
      { code: 'AR-U', name: 'Chubut' },
      { code: 'AR-X', name: 'Cordoba' },
      { code: 'AR-W', name: 'Corrientes' },
      { code: 'AR-E', name: 'Entre Rios' },
      { code: 'AR-P', name: 'Formosa' },
      { code: 'AR-Y', name: 'Jujuy' },
      { code: 'AR-L', name: 'La Pampa' },
      { code: 'AR-F', name: 'La Rioja' },
      { code: 'AR-M', name: 'Mendoza' },
      { code: 'AR-N', name: 'Misiones' },
      { code: 'AR-Q', name: 'Neuquen' },
      { code: 'AR-R', name: 'Rio Negro' },
      { code: 'AR-A', name: 'Salta' },
      { code: 'AR-J', name: 'San Juan' },
      { code: 'AR-D', name: 'San Luis' },
      { code: 'AR-Z', name: 'Santa Cruz' },
      { code: 'AR-S', name: 'Santa Fe' },
      { code: 'AR-G', name: 'Santiago del Estero' },
      { code: 'AR-V', name: 'Tierra del Fuego' },
      { code: 'AR-T', name: 'Tucuman' }
    ]
  },
  {
    code: 'PA',
    name: 'Panama',
    currency: 'USD',
    currencySymbol: '$',
    phonePrefix: '+507',
    provinces: [
      { code: 'PA-1', name: 'Bocas del Toro' },
      { code: 'PA-4', name: 'Chiriqui' },
      { code: 'PA-2', name: 'Cocle' },
      { code: 'PA-3', name: 'Colon' },
      { code: 'PA-5', name: 'Darien' },
      { code: 'PA-EM', name: 'Embera-Wounaan' },
      { code: 'PA-KY', name: 'Guna Yala' },
      { code: 'PA-6', name: 'Herrera' },
      { code: 'PA-7', name: 'Los Santos' },
      { code: 'PA-NB', name: 'Ngabe-Bugle' },
      { code: 'PA-8', name: 'Panama' },
      { code: 'PA-10', name: 'Panama Oeste' },
      { code: 'PA-9', name: 'Veraguas' }
    ]
  },
  {
    code: 'ES',
    name: 'Espana',
    currency: 'EUR',
    currencySymbol: '\u20AC',
    phonePrefix: '+34',
    provinces: [
      { code: 'ES-AN', name: 'Andalucia' },
      { code: 'ES-AR', name: 'Aragon' },
      { code: 'ES-AS', name: 'Asturias' },
      { code: 'ES-IB', name: 'Islas Baleares' },
      { code: 'ES-CN', name: 'Canarias' },
      { code: 'ES-CB', name: 'Cantabria' },
      { code: 'ES-CL', name: 'Castilla y Leon' },
      { code: 'ES-CM', name: 'Castilla-La Mancha' },
      { code: 'ES-CT', name: 'Cataluna' },
      { code: 'ES-CE', name: 'Ceuta' },
      { code: 'ES-EX', name: 'Extremadura' },
      { code: 'ES-GA', name: 'Galicia' },
      { code: 'ES-MD', name: 'Madrid' },
      { code: 'ES-ML', name: 'Melilla' },
      { code: 'ES-MC', name: 'Murcia' },
      { code: 'ES-NC', name: 'Navarra' },
      { code: 'ES-PV', name: 'Pais Vasco' },
      { code: 'ES-RI', name: 'La Rioja' },
      { code: 'ES-VC', name: 'Comunidad Valenciana' }
    ]
  },
  {
    code: 'PT',
    name: 'Portugal',
    currency: 'EUR',
    currencySymbol: '\u20AC',
    phonePrefix: '+351',
    provinces: [
      { code: 'PT-01', name: 'Aveiro' },
      { code: 'PT-02', name: 'Beja' },
      { code: 'PT-03', name: 'Braga' },
      { code: 'PT-04', name: 'Braganca' },
      { code: 'PT-05', name: 'Castelo Branco' },
      { code: 'PT-06', name: 'Coimbra' },
      { code: 'PT-07', name: 'Evora' },
      { code: 'PT-08', name: 'Faro' },
      { code: 'PT-09', name: 'Guarda' },
      { code: 'PT-10', name: 'Leiria' },
      { code: 'PT-11', name: 'Lisboa' },
      { code: 'PT-12', name: 'Portalegre' },
      { code: 'PT-13', name: 'Porto' },
      { code: 'PT-14', name: 'Santarem' },
      { code: 'PT-15', name: 'Setubal' },
      { code: 'PT-16', name: 'Viana do Castelo' },
      { code: 'PT-17', name: 'Vila Real' },
      { code: 'PT-18', name: 'Viseu' },
      { code: 'PT-20', name: 'Regiao Autonoma dos Acores' },
      { code: 'PT-30', name: 'Regiao Autonoma da Madeira' }
    ]
  }
];

export function getCountryByCode(code: string): Country | undefined {
  return LATAM_COUNTRIES.find((country) => country.code === code);
}

export function getProvincesByCountryCode(code: string): Province[] {
  const country = getCountryByCode(code);
  return country ? country.provinces : [];
}
