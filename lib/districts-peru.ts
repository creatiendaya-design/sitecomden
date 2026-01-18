// Lista de distritos principales del Perú
// Para usar en selectores de dirección

export interface District {
  code: string; // Código UBIGEO
  name: string;
  province: string;
  department: string;
}

// Distritos de Lima (los más comunes)
export const LIMA_DISTRICTS: District[] = [
  { code: "150101", name: "Lima (Cercado)", province: "Lima", department: "Lima" },
  { code: "150102", name: "Ancón", province: "Lima", department: "Lima" },
  { code: "150103", name: "Ate", province: "Lima", department: "Lima" },
  { code: "150104", name: "Barranco", province: "Lima", department: "Lima" },
  { code: "150105", name: "Breña", province: "Lima", department: "Lima" },
  { code: "150106", name: "Carabayllo", province: "Lima", department: "Lima" },
  { code: "150107", name: "Chaclacayo", province: "Lima", department: "Lima" },
  { code: "150108", name: "Chorrillos", province: "Lima", department: "Lima" },
  { code: "150109", name: "Cieneguilla", province: "Lima", department: "Lima" },
  { code: "150110", name: "Comas", province: "Lima", department: "Lima" },
  { code: "150111", name: "El Agustino", province: "Lima", department: "Lima" },
  { code: "150112", name: "Independencia", province: "Lima", department: "Lima" },
  { code: "150113", name: "Jesús María", province: "Lima", department: "Lima" },
  { code: "150114", name: "La Molina", province: "Lima", department: "Lima" },
  { code: "150115", name: "La Victoria", province: "Lima", department: "Lima" },
  { code: "150116", name: "Lince", province: "Lima", department: "Lima" },
  { code: "150117", name: "Los Olivos", province: "Lima", department: "Lima" },
  { code: "150118", name: "Lurigancho", province: "Lima", department: "Lima" },
  { code: "150119", name: "Lurín", province: "Lima", department: "Lima" },
  { code: "150120", name: "Magdalena del Mar", province: "Lima", department: "Lima" },
  { code: "150121", name: "Pueblo Libre", province: "Lima", department: "Lima" },
  { code: "150122", name: "Miraflores", province: "Lima", department: "Lima" },
  { code: "150123", name: "Pachacámac", province: "Lima", department: "Lima" },
  { code: "150124", name: "Pucusana", province: "Lima", department: "Lima" },
  { code: "150125", name: "Puente Piedra", province: "Lima", department: "Lima" },
  { code: "150126", name: "Punta Hermosa", province: "Lima", department: "Lima" },
  { code: "150127", name: "Punta Negra", province: "Lima", department: "Lima" },
  { code: "150128", name: "Rímac", province: "Lima", department: "Lima" },
  { code: "150129", name: "San Bartolo", province: "Lima", department: "Lima" },
  { code: "150130", name: "San Borja", province: "Lima", department: "Lima" },
  { code: "150131", name: "San Isidro", province: "Lima", department: "Lima" },
  { code: "150132", name: "San Juan de Lurigancho", province: "Lima", department: "Lima" },
  { code: "150133", name: "San Juan de Miraflores", province: "Lima", department: "Lima" },
  { code: "150134", name: "San Luis", province: "Lima", department: "Lima" },
  { code: "150135", name: "San Martín de Porres", province: "Lima", department: "Lima" },
  { code: "150136", name: "San Miguel", province: "Lima", department: "Lima" },
  { code: "150137", name: "Santa Anita", province: "Lima", department: "Lima" },
  { code: "150138", name: "Santa María del Mar", province: "Lima", department: "Lima" },
  { code: "150139", name: "Santa Rosa", province: "Lima", department: "Lima" },
  { code: "150140", name: "Santiago de Surco", province: "Lima", department: "Lima" },
  { code: "150141", name: "Surquillo", province: "Lima", department: "Lima" },
  { code: "150142", name: "Villa El Salvador", province: "Lima", department: "Lima" },
  { code: "150143", name: "Villa María del Triunfo", province: "Lima", department: "Lima" },
];

// Distritos del Callao
export const CALLAO_DISTRICTS: District[] = [
  { code: "070101", name: "Callao", province: "Callao", department: "Callao" },
  { code: "070102", name: "Bellavista", province: "Callao", department: "Callao" },
  { code: "070103", name: "Carmen de la Legua", province: "Callao", department: "Callao" },
  { code: "070104", name: "La Perla", province: "Callao", department: "Callao" },
  { code: "070105", name: "La Punta", province: "Callao", department: "Callao" },
  { code: "070106", name: "Ventanilla", province: "Callao", department: "Callao" },
  { code: "070107", name: "Mi Perú", province: "Callao", department: "Callao" },
];

// Distritos de Arequipa (principales)
export const AREQUIPA_DISTRICTS: District[] = [
  { code: "040101", name: "Arequipa", province: "Arequipa", department: "Arequipa" },
  { code: "040102", name: "Alto Selva Alegre", province: "Arequipa", department: "Arequipa" },
  { code: "040103", name: "Cayma", province: "Arequipa", department: "Arequipa" },
  { code: "040104", name: "Cerro Colorado", province: "Arequipa", department: "Arequipa" },
  { code: "040105", name: "Characato", province: "Arequipa", department: "Arequipa" },
  { code: "040106", name: "Chiguata", province: "Arequipa", department: "Arequipa" },
  { code: "040107", name: "Jacobo Hunter", province: "Arequipa", department: "Arequipa" },
  { code: "040108", name: "José Luis Bustamante y Rivero", province: "Arequipa", department: "Arequipa" },
  { code: "040109", name: "La Joya", province: "Arequipa", department: "Arequipa" },
  { code: "040110", name: "Mariano Melgar", province: "Arequipa", department: "Arequipa" },
  { code: "040111", name: "Miraflores", province: "Arequipa", department: "Arequipa" },
  { code: "040112", name: "Mollebaya", province: "Arequipa", department: "Arequipa" },
  { code: "040113", name: "Paucarpata", province: "Arequipa", department: "Arequipa" },
  { code: "040114", name: "Pocsi", province: "Arequipa", department: "Arequipa" },
  { code: "040115", name: "Polobaya", province: "Arequipa", department: "Arequipa" },
  { code: "040116", name: "Quequeña", province: "Arequipa", department: "Arequipa" },
  { code: "040117", name: "Sabandia", province: "Arequipa", department: "Arequipa" },
  { code: "040118", name: "Sachaca", province: "Arequipa", department: "Arequipa" },
  { code: "040119", name: "San Juan de Siguas", province: "Arequipa", department: "Arequipa" },
  { code: "040120", name: "San Juan de Tarucani", province: "Arequipa", department: "Arequipa" },
  { code: "040121", name: "Santa Isabel de Siguas", province: "Arequipa", department: "Arequipa" },
  { code: "040122", name: "Santa Rita de Siguas", province: "Arequipa", department: "Arequipa" },
  { code: "040123", name: "Socabaya", province: "Arequipa", department: "Arequipa" },
  { code: "040124", name: "Tiabaya", province: "Arequipa", department: "Arequipa" },
  { code: "040125", name: "Uchumayo", province: "Arequipa", department: "Arequipa" },
  { code: "040126", name: "Vitor", province: "Arequipa", department: "Arequipa" },
  { code: "040127", name: "Yanahuara", province: "Arequipa", department: "Arequipa" },
  { code: "040128", name: "Yarabamba", province: "Arequipa", department: "Arequipa" },
  { code: "040129", name: "Yura", province: "Arequipa", department: "Arequipa" },
];

// Todos los distritos combinados
export const ALL_DISTRICTS: District[] = [
  ...LIMA_DISTRICTS,
  ...CALLAO_DISTRICTS,
  ...AREQUIPA_DISTRICTS,
];

// Helper para buscar distrito por código
export function getDistrictByCode(code: string): District | undefined {
  return ALL_DISTRICTS.find((d) => d.code === code);
}

// Helper para buscar distritos por nombre
export function searchDistricts(query: string): District[] {
  const lowerQuery = query.toLowerCase();
  return ALL_DISTRICTS.filter((d) =>
    d.name.toLowerCase().includes(lowerQuery)
  );
}

// Helper para agrupar distritos por departamento
export function groupDistrictsByDepartment(): Record<string, District[]> {
  return ALL_DISTRICTS.reduce((acc, district) => {
    if (!acc[district.department]) {
      acc[district.department] = [];
    }
    acc[district.department].push(district);
    return acc;
  }, {} as Record<string, District[]>);
}