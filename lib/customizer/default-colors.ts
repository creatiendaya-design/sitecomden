// lib/customizer/default-colors.ts
import type { ColorDef } from "./types";

const G = (group: string, items: Array<[string, string]>): ColorDef[] =>
  items.map(([hex, name]) => ({ hex, name, group }));

export const DEFAULT_COLORS: ColorDef[] = [
  ...G("blacks-grays", [
    ["#000000", "Negro"], ["#1A1A1A", "Negro carbón"], ["#2C2C2C", "Grafito"],
    ["#3D3D3D", "Plomo oscuro"], ["#4F4F4F", "Plomo"], ["#6B6B6B", "Plomo claro"],
    ["#8C8C8C", "Gris medio"], ["#A8A8A8", "Gris"], ["#BFBFBF", "Gris perla"],
    ["#D9D9D9", "Gris claro"], ["#EDEDED", "Casi blanco"], ["#FFFFFF", "Blanco"],
  ]),
  ...G("reds-browns", [
    ["#7F1D1D", "Vino"], ["#991B1B", "Borgoña"], ["#B91C1C", "Carmín"],
    ["#DC2626", "Rojo"], ["#EF4444", "Rojo brillante"], ["#F87171", "Rojo coral"],
    ["#FCA5A5", "Rosado salmón"], ["#5C2E1B", "Marrón oscuro"],
    ["#7C3F1F", "Castaño"], ["#92531C", "Caramelo"], ["#A65D2E", "Cobre"],
    ["#BE6E3D", "Tabaco"], ["#D08552", "Madera"], ["#E0A375", "Beige cálido"],
    ["#EBC19A", "Arena"], ["#F2D7B7", "Crema oscura"],
  ]),
  ...G("oranges", [
    ["#7C2D12", "Ladrillo"], ["#9A3412", "Óxido"], ["#C2410C", "Naranja terracota"],
    ["#EA580C", "Naranja"], ["#F97316", "Naranja brillante"], ["#FB923C", "Mandarina"],
    ["#FDBA74", "Durazno"], ["#FED7AA", "Melocotón claro"],
    ["#FFEDD5", "Crema naranja"], ["#FFF7ED", "Blanco naranja"],
  ]),
  ...G("yellows", [
    ["#713F12", "Mostaza oscura"], ["#854D0E", "Ámbar oscuro"],
    ["#A16207", "Mostaza"], ["#CA8A04", "Dorado"], ["#EAB308", "Amarillo dorado"],
    ["#FACC15", "Amarillo"], ["#FDE047", "Amarillo limón"],
    ["#FEF08A", "Amarillo pastel"], ["#FEF9C3", "Amarillo crema"],
    ["#FEFCE8", "Marfil"],
  ]),
  ...G("greens", [
    ["#14532D", "Verde bosque"], ["#166534", "Verde oscuro"],
    ["#15803D", "Verde botella"], ["#16A34A", "Verde"], ["#22C55E", "Verde brillante"],
    ["#4ADE80", "Verde menta"], ["#86EFAC", "Verde claro"],
    ["#BBF7D0", "Verde pastel"], ["#365314", "Oliva oscuro"],
    ["#3F6212", "Oliva"], ["#65A30D", "Lima oscuro"], ["#84CC16", "Lima"],
    ["#A3E635", "Lima brillante"], ["#BEF264", "Lima claro"],
    ["#D9F99D", "Verde pálido"], ["#ECFCCB", "Verde claro pastel"],
  ]),
  ...G("blues", [
    ["#0C4A6E", "Azul marino oscuro"], ["#075985", "Azul marino"],
    ["#0369A1", "Azul medio"], ["#0284C7", "Azul"], ["#0EA5E9", "Azul cielo"],
    ["#38BDF8", "Celeste"], ["#7DD3FC", "Celeste claro"],
    ["#BAE6FD", "Celeste pastel"], ["#1E3A8A", "Azul royal oscuro"],
    ["#1E40AF", "Azul royal"], ["#2563EB", "Azul brillante"],
    ["#3B82F6", "Azul medio brillante"], ["#60A5FA", "Azul lavanda"],
    ["#93C5FD", "Azul cielo claro"], ["#BFDBFE", "Azul pastel"],
    ["#DBEAFE", "Azul muy claro"],
  ]),
  ...G("purples", [
    ["#3B0764", "Violeta oscuro"], ["#581C87", "Púrpura"], ["#6B21A8", "Morado"],
    ["#7E22CE", "Morado brillante"], ["#9333EA", "Violeta"], ["#A855F7", "Lavanda"],
    ["#C084FC", "Lila"], ["#D8B4FE", "Lila claro"], ["#4C1D95", "Índigo oscuro"],
    ["#5B21B6", "Índigo"], ["#6D28D9", "Índigo brillante"], ["#7C3AED", "Violeta brillante"],
  ]),
  ...G("pinks", [
    ["#831843", "Borgoña rosa"], ["#9F1239", "Rosa oscuro"],
    ["#BE123C", "Rosa fuerte"], ["#E11D48", "Rosa rojo"],
    ["#F43F5E", "Rosa coral"], ["#FB7185", "Rosa salmón"],
    ["#FDA4AF", "Rosa claro"], ["#FECDD3", "Rosa pastel"],
    ["#86198F", "Magenta oscuro"], ["#A21CAF", "Magenta"],
    ["#C026D3", "Magenta brillante"], ["#E879F9", "Rosa fucsia"],
  ]),
  ...G("pastel-neutrals", [
    ["#FAFAF9", "Hueso"], ["#F5F5F4", "Lino"], ["#E7E5E4", "Beige claro"],
    ["#D6D3D1", "Beige"], ["#A8A29E", "Beige oscuro"], ["#78716C", "Topo"],
    ["#57534E", "Topo oscuro"], ["#F1F5F9", "Blanco azulado"],
    ["#E2E8F0", "Gris azulado claro"], ["#CBD5E1", "Gris azulado"],
    ["#94A3B8", "Pizarra"], ["#FDF4FF", "Blanco rosado"],
    ["#FAE8FF", "Lavanda muy clara"], ["#FCE7F3", "Rosa muy claro"],
    ["#FFF1F2", "Blanco rosa"], ["#FFFBEB", "Marfil pastel"],
  ]),
];

export function getColorByHex(hex: string): ColorDef | undefined {
  const target = hex.toUpperCase();
  return DEFAULT_COLORS.find((c) => c.hex.toUpperCase() === target);
}

export function getColorsByGroup(group: string): ColorDef[] {
  return DEFAULT_COLORS.filter((c) => c.group === group);
}
