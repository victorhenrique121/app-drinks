import type { IngredientCategory, Unit } from '@/types/database';

/**
 * Dados do MODO DEMONSTRAÇÃO (quando o Supabase não está configurado).
 * A lista de ingredientes segue a MESMA ordem do seed em supabase/schema.sql.
 */
export const SEED_INGREDIENTS: [string, IngredientCategory, string][] = [
  ['Vodka', 'destilado', 'Destilado neutro, cerca de 40% de álcool.'],
  ['Gin', 'destilado', 'Destilado aromatizado com zimbro.'],
  ['Rum branco', 'destilado', 'Destilado de cana, leve e seco.'],
  ['Rum ouro', 'destilado', 'Rum envelhecido, notas de baunilha.'],
  ['Cachaça', 'destilado', 'Destilado brasileiro de cana-de-açúcar.'],
  ['Tequila', 'destilado', 'Destilado de agave azul.'],
  ['Whisky', 'destilado', 'Destilado de cereais envelhecido em barril.'],
  ['Conhaque', 'destilado', 'Destilado de vinho envelhecido.'],
  ['Licor de laranja', 'licor', 'Licor cítrico (estilo triple sec).'],
  ['Licor de café', 'licor', 'Licor adocicado de café. Contém álcool.'],
  ['Amaretto', 'licor', 'Licor de amêndoas.'],
  ['Campari', 'licor', 'Bitter italiano, amargo e vermelho.'],
  ['Aperol', 'licor', 'Bitter de laranja, leve e amargo.'],
  ['Licor de creme irlandês', 'licor', 'Licor cremoso à base de whisky.'],
  ['Vermute rosso', 'alcool', 'Vinho fortificado e aromatizado.'],
  ['Espumante', 'alcool', 'Vinho espumante seco.'],
  ['Vinho tinto', 'alcool', 'Vinho tinto seco.'],
  ['Vinho branco', 'alcool', 'Vinho branco seco.'],
  ['Cerveja', 'alcool', 'Cerveja tipo lager.'],
  ['Saquê', 'alcool', 'Fermentado de arroz japonês.'],
  ['Angostura bitters', 'alcool', 'Bitter aromático concentrado (usado em dashes).'],
  ['Leite', 'laticinio', 'Leite integral.'],
  ['Leite condensado', 'laticinio', 'Leite concentrado e adoçado.'],
  ['Creme de leite', 'laticinio', 'Creme de leite fresco ou de caixinha.'],
  ['Iogurte natural', 'laticinio', 'Iogurte integral sem açúcar.'],
  ['Sorvete de creme', 'laticinio', 'Sorvete à base de leite.'],
  ['Limão taiti', 'acido_forte', 'Limão verde, muito ácido.'],
  ['Suco de limão', 'acido_forte', 'Suco de limão espremido na hora.'],
  ['Limão siciliano', 'acido_forte', 'Limão amarelo, ácido e aromático.'],
  ['Vinagre de maçã', 'acido_forte', 'Vinagre usado em shrubs.'],
  ['Energético', 'estimulante', 'Bebida com cafeína e taurina.'],
  ['Café espresso', 'estimulante', 'Café concentrado, rico em cafeína.'],
  ['Cold brew', 'estimulante', 'Café extraído a frio.'],
  ['Chá mate', 'estimulante', 'Infusão de erva-mate, contém cafeína.'],
  ['Guaraná em pó', 'estimulante', 'Pó de guaraná, alto teor de cafeína.'],
  ['Morango', 'fruta', 'Morangos frescos.'],
  ['Maracujá (polpa)', 'fruta', 'Polpa de maracujá com sementes.'],
  ['Abacaxi', 'fruta', 'Abacaxi fresco em pedaços.'],
  ['Laranja', 'fruta', 'Laranja fresca.'],
  ['Melancia', 'fruta', 'Melancia em cubos.'],
  ['Frutas vermelhas', 'fruta', 'Mix de amora, framboesa e mirtilo.'],
  ['Kiwi', 'fruta', 'Kiwi maduro.'],
  ['Suco de laranja', 'suco', 'Suco natural de laranja.'],
  ['Suco de abacaxi', 'suco', 'Suco de abacaxi.'],
  ['Suco de cranberry', 'suco', 'Suco de cranberry.'],
  ['Suco de maçã', 'suco', 'Suco de maçã.'],
  ['Suco de tomate', 'suco', 'Suco de tomate temperado ou natural.'],
  ['Água tônica', 'refrigerante', 'Refrigerante levemente amargo (quinino).'],
  ['Ginger ale', 'refrigerante', 'Refrigerante de gengibre.'],
  ['Refrigerante de limão', 'refrigerante', 'Refrigerante sabor limão.'],
  ['Cola', 'refrigerante', 'Refrigerante de cola.'],
  ['Xarope simples', 'xarope', 'Açúcar e água em partes iguais.'],
  ['Xarope de groselha', 'xarope', 'Xarope vermelho adocicado.'],
  ['Mel', 'xarope', 'Mel de abelha.'],
  ['Xarope de agave', 'xarope', 'Adoçante de agave.'],
  ['Xarope de gengibre', 'xarope', 'Xarope picante de gengibre.'],
  ['Água com gás', 'agua', 'Água gaseificada.'],
  ['Água', 'agua', 'Água filtrada.'],
  ['Gelo', 'agua', 'Cubos de gelo.'],
  ['Hortelã', 'outro', 'Folhas frescas de hortelã.'],
  ['Manjericão', 'outro', 'Folhas frescas de manjericão.'],
  ['Gengibre', 'outro', 'Raiz de gengibre fresca.'],
  ['Açúcar', 'outro', 'Açúcar refinado ou demerara.'],
  ['Sal', 'outro', 'Sal para crusta ou tempero.'],
  ['Canela', 'outro', 'Canela em pau ou em pó.'],
  ['Leite de coco', 'outro', 'Bebida vegetal de coco (não é laticínio).'],
];

export const DEMO_TEAM_AUTHOR = { id: 'demo-equipe', nome: 'Equipe Copo Certo', email: null as string | null };

const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1000`;

export interface SeedDrink {
  nome: string;
  descricao: string;
  tipo: 'drink' | 'mocktail';
  imagem: string;
  preparo: string;
  diasAtras: number;
  favoritos: number;
  ingredientes: [string, number | null, Unit][];
}

export const SEED_DRINKS: SeedDrink[] = [
  {
    nome: 'Caipirinha clássica',
    descricao: 'O drink brasileiro por excelência: cachaça, limão fresco e açúcar na medida.',
    tipo: 'drink',
    imagem: px(16859952),
    preparo:
      'Corte o limão em gomos e retire o miolo branco.\nMacere o limão com o açúcar no copo, sem exagerar para não amargar.\nComplete com gelo e adicione a cachaça.\nMisture bem e sirva.',
    diasAtras: 1,
    favoritos: 42,
    ingredientes: [
      ['Cachaça', 50, 'ml'],
      ['Limão taiti', 1, 'unidade'],
      ['Açúcar', 2, 'colher_cha'],
      ['Gelo', null, 'a_gosto'],
    ],
  },
  {
    nome: 'Negroni',
    descricao: 'Amargo, elegante e equilibrado. Partes iguais de gin, Campari e vermute.',
    tipo: 'drink',
    imagem: px(36189465),
    preparo:
      'Adicione gin, Campari e vermute em um copo misturador com gelo.\nMexa por cerca de 30 segundos.\nCoe para um copo baixo com uma pedra grande de gelo.\nFinalize com uma fatia de laranja.',
    diasAtras: 3,
    favoritos: 31,
    ingredientes: [
      ['Gin', 30, 'ml'],
      ['Campari', 30, 'ml'],
      ['Vermute rosso', 30, 'ml'],
      ['Laranja', 1, 'fatia'],
    ],
  },
  {
    nome: 'Limonada de morango',
    descricao: 'Refrescante, frutada e sem álcool. Perfeita para dias quentes.',
    tipo: 'mocktail',
    imagem: px(30591640),
    preparo:
      'Amasse os morangos com o xarope no fundo da coqueteleira.\nAdicione o suco de limão e gelo, e agite bem.\nCoe para um copo alto com gelo e complete com água com gás.',
    diasAtras: 2,
    favoritos: 27,
    ingredientes: [
      ['Morango', 6, 'unidade'],
      ['Suco de limão', 30, 'ml'],
      ['Xarope simples', 20, 'ml'],
      ['Água com gás', 150, 'ml'],
    ],
  },
  {
    nome: 'Margarita',
    descricao: 'Tequila, licor de laranja e limão, com a clássica borda de sal.',
    tipo: 'drink',
    imagem: px(2260281),
    preparo:
      'Passe limão na borda da taça e mergulhe no sal.\nAgite tequila, licor de laranja e suco de limão com gelo.\nCoe para a taça preparada.',
    diasAtras: 6,
    favoritos: 25,
    ingredientes: [
      ['Tequila', 50, 'ml'],
      ['Licor de laranja', 20, 'ml'],
      ['Suco de limão', 25, 'ml'],
      ['Sal', null, 'a_gosto'],
    ],
  },
  {
    nome: 'Virgin mojito',
    descricao: 'Hortelã, limão e bolhas. Toda a leveza do mojito, sem álcool.',
    tipo: 'mocktail',
    imagem: px(17612833),
    preparo:
      'Macere levemente as folhas de hortelã com o xarope e o limão.\nAdicione gelo até a borda.\nComplete com água com gás e misture de baixo para cima.',
    diasAtras: 4,
    favoritos: 19,
    ingredientes: [
      ['Hortelã', 8, 'folha'],
      ['Limão taiti', 1, 'unidade'],
      ['Xarope simples', 20, 'ml'],
      ['Água com gás', 150, 'ml'],
      ['Gelo', null, 'a_gosto'],
    ],
  },
  {
    nome: 'Aperol spritz',
    descricao: 'Leve e borbulhante: o aperitivo italiano mais famoso do verão.',
    tipo: 'drink',
    imagem: px(16859958),
    preparo:
      'Encha uma taça de vinho com gelo.\nAdicione o espumante, depois o Aperol.\nComplete com um toque de água com gás e decore com laranja.',
    diasAtras: 8,
    favoritos: 22,
    ingredientes: [
      ['Espumante', 90, 'ml'],
      ['Aperol', 60, 'ml'],
      ['Água com gás', 30, 'ml'],
      ['Laranja', 1, 'fatia'],
    ],
  },
  {
    nome: 'Batida de maracujá',
    descricao: 'Cremosa e tropical, com polpa de maracujá e leite condensado.',
    tipo: 'drink',
    imagem: px(605408),
    preparo:
      'Bata no liquidificador a polpa de maracujá, o leite condensado e a cachaça.\nAdicione gelo e bata novamente por alguns segundos.\nSirva bem gelada.',
    diasAtras: 10,
    favoritos: 14,
    ingredientes: [
      ['Cachaça', 50, 'ml'],
      ['Maracujá (polpa)', 60, 'ml'],
      ['Leite condensado', 80, 'ml'],
      ['Gelo', null, 'a_gosto'],
    ],
  },
  {
    nome: 'Sunrise tropical',
    descricao: 'Camadas de laranja, abacaxi e groselha. Colorido e sem álcool.',
    tipo: 'mocktail',
    imagem: px(10986584),
    preparo:
      'Encha um copo alto com gelo.\nAdicione o suco de laranja e o suco de abacaxi.\nDespeje a groselha lentamente pela lateral para formar o degradê.',
    diasAtras: 12,
    favoritos: 11,
    ingredientes: [
      ['Suco de laranja', 120, 'ml'],
      ['Suco de abacaxi', 60, 'ml'],
      ['Xarope de groselha', 15, 'ml'],
      ['Gelo', null, 'a_gosto'],
    ],
  },
  {
    nome: 'Fizz de frutas vermelhas',
    descricao: 'Frutas vermelhas, mel e limão com água com gás.',
    tipo: 'mocktail',
    imagem: px(17612813),
    preparo:
      'Macere as frutas vermelhas com o mel.\nAdicione o suco de limão e gelo.\nComplete com água com gás e decore com hortelã.',
    diasAtras: 15,
    favoritos: 9,
    ingredientes: [
      ['Frutas vermelhas', 50, 'g'],
      ['Suco de limão', 20, 'ml'],
      ['Mel', 15, 'ml'],
      ['Água com gás', 150, 'ml'],
    ],
  },
];
