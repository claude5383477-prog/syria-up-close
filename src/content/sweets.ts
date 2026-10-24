// What each city's sweets are known for (owner request 2026-10-24: the kinds first, then the shops).
// Only the well-known specialities; a city without an entry waits for its correspondent.
type T = { ar: string; en: string }
export type Sweet = { name: T; note: T }

export const SWEETS: Record<string, Sweet[]> = {
  damascus: [
    {
      name: { ar: 'البوظة العربية المدقوقة', en: 'Pounded Arabic ice cream' },
      note: {
        ar: 'بوظة بالسحلب تُدق بالمدقة وتتغطى بالفستق الحلبي، وأشهرها بسوق الحميدية.',
        en: 'Salep ice cream pounded by hand and rolled in pistachio, best known in Souq al-Hamidiyya.',
      },
    },
    {
      name: { ar: 'البرازق والغريبة', en: 'Barazek and ghraybeh' },
      note: {
        ar: 'كعك ناشف رقيق: البرازق بالسمسم والفستق، والغريبة بالسمن تذوب بالتم.',
        en: 'Thin crisp biscuits: barazek with sesame and pistachio, ghraybeh with ghee that melts in the mouth.',
      },
    },
    {
      name: {
        ar: 'المبرومة والبلورية وعش البلبل',
        en: 'Mabrumeh, balloriyeh and nightingale’s nests',
      },
      note: {
        ar: 'حلو العجين الرقيق والسمن والفستق، يُشترى بالكيلو للضيوف والعزايم.',
        en: 'Fine pastry, ghee and pistachio, bought by the kilo for guests and gatherings.',
      },
    },
  ],
  aleppo: [
    {
      name: { ar: 'الكرابيج مع الناطف', en: 'Karabij with natef' },
      note: {
        ar: 'أقراص سميد محشية جوز تتغمس بالناطف الأبيض، ومن أشهر ما يُهدى من حلب.',
        en: 'Semolina rounds filled with walnut, dipped in white natef cream; a classic gift from Aleppo.',
      },
    },
    {
      name: { ar: 'حلويات الفستق الحلبي', en: 'Pistachio sweets' },
      note: {
        ar: 'مبرومة وبقلاوة محشية بالفستق، والفستق نفسه يحمل اسم المدينة.',
        en: 'Mabrumeh and baklava packed with pistachio, the nut that carries the city’s name.',
      },
    },
  ],
  homs: [
    {
      name: { ar: 'حلاوة الجبن الحمصية', en: 'Homs halawet el-jibn' },
      note: {
        ar: 'عجينة جبن وسميد ملفوفة على القشطة، مع القطر والفستق.',
        en: 'A cheese and semolina dough rolled around cream, with syrup and pistachio.',
      },
    },
    {
      name: { ar: 'المعروك', en: 'Maarouk' },
      note: {
        ar: 'خبز حلو بالسمسم وحبة البركة يكثر برمضان، ومنه المحشي بالتمر.',
        en: 'A sweet bread with sesame and nigella, everywhere in Ramadan, some filled with dates.',
      },
    },
  ],
  hama: [
    {
      name: { ar: 'حلاوة الجبن الحموية', en: 'Hama halawet el-jibn' },
      note: {
        ar: 'حماة وحمص تتنافسان عليها، ولكل منهما طريقته في العجينة والقشطة.',
        en: 'Hama and Homs both claim it, each with its own dough and cream.',
      },
    },
  ],
  'deir-ez-zor': [
    {
      name: { ar: 'الكليجة الديرية', en: 'Deir ez-Zor kleicha' },
      note: {
        ar: 'أقراص عجين محشية تمر، تُخبز بالعيد وتُقدَّم مع الشاي.',
        en: 'Date-filled pastries baked for Eid and served with tea.',
      },
    },
  ],
  suwayda: [
    {
      name: { ar: 'دبس العنب', en: 'Grape molasses' },
      note: {
        ar: 'من كروم جبل العرب، يُؤكل مع الطحينة أو الخبز.',
        en: 'From the vineyards of Jabal al-Arab, eaten with tahini or bread.',
      },
    },
  ],
}
