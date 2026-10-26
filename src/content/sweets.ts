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
  // Added 2026-10-27 from local reporting: Alkhabar (2024), Focus Aleppo (2021), Zaman al-Wasl (2019),
  // Alsori (2021), SANA, Snack Syrian (2018), Ronahi (2025) and Enab Baladi.
  latakia: [
    {
      name: { ar: 'الجزرية', en: 'Jazariyeh (carrot sweet)' },
      note: {
        ar: 'جزر مبشور مطبوخ بالسكر مع جوز الهند والجوز، يتشكّل كرات أو أهرامات. حلو تراثي مرتبط بأهل اللاذقية وبيكثر برمضان.',
        en: 'Grated carrot cooked with sugar, coconut and walnut, shaped into balls or little pyramids. A heritage sweet tied to Latakia, most in demand in Ramadan.',
      },
    },
  ],
  tartous: [
    {
      name: { ar: 'التلاج', en: 'Tallaj' },
      note: {
        ar: 'رقائق عجين سميد رفيعة مخبوزة ومنقوعة بالقطر، سادة أو بالجوز أو القشطة. بينعمل بطرطوس من عقود وبيكثر بالأعياد.',
        en: 'Thin baked semolina sheets soaked in syrup, plain or with walnut or cream. Made in Tartus for decades, most of all at Eid.',
      },
    },
  ],
  idlib: [
    {
      name: { ar: 'الشعيبيات', en: 'Shaibiyat' },
      note: {
        ar: 'عجينة رقائق بالسمن محشية قشطة، تنخبز ويُسكب عليها القطر وتنقدّم سخنة. من تراث إدلب، وتنافسها عليها أريحا.',
        en: 'Ghee-layered pastry filled with cream, baked, soaked in syrup and served hot. Part of Idlib’s heritage; Ariha claims it too.',
      },
    },
    {
      name: { ar: 'حريرة الجدق', en: 'Harirat al-jidq' },
      note: {
        ar: 'جوز مشكوك بخيط ومغطّس بعصير العنب المعقود، حلو موسم القطاف بسلقين.',
        en: 'Walnuts on a string dipped in thickened grape juice, a harvest-season sweet from Salqin.',
      },
    },
  ],
  daraa: [
    {
      name: { ar: 'الراحة الحورانية', en: 'Hauran raha' },
      note: {
        ar: 'راحة بتتصنّع بدرعا من أجيال، وعدّت سانا 12 منشأة مستمرة بإنتاجها.',
        en: 'Turkish delight made in Daraa for generations; SANA counted 12 workshops still producing it.',
      },
    },
    {
      name: { ar: 'اللزاقيات', en: 'Lazzaqiyat' },
      note: {
        ar: 'رقاقات خبز رفيعة بزيت الزيتون والسكر، مرصوفة فوق بعض وتنقطّع مثلثات. حلو بيتي حوراني، أكثر ما ينعمل برمضان.',
        en: 'Thin breads layered with olive oil and sugar, cut into triangles. A home-made Hauran sweet, mostly in Ramadan.',
      },
    },
  ],
  quneitra: [
    {
      name: { ar: 'اللزاقي', en: 'Lazzaqi' },
      note: {
        ar: 'رغفان على الصاج مرصوفة بصينية مع السمنة البلدية أو الدبس، وفوقها جوز أو حبة البركة. ويسمّوه "كنافة البدو"، وبيتقدّم بالأعراس وبعد الحصاد.',
        en: 'Saj breads stacked with ghee or grape molasses, topped with walnut or black seed. Called “Bedouin kunafa”, served at weddings and after the harvest.',
      },
    },
  ],
  raqqa: [
    {
      name: { ar: 'السيالة', en: 'Siyala' },
      note: {
        ar: 'رقائق عجين على الصاج مع السمن البلدي ودبس التمر أو السكر، بتنقدّم بصينية بالشتوية مع الشاي المر.',
        en: 'Thin saj breads with ghee and date molasses or sugar, served on a tray in winter with bitter tea.',
      },
    },
  ],
  hasakah: [
    {
      name: { ar: 'الكليجة', en: 'Kleicha' },
      note: {
        ar: 'حلوى العيد وموروث الأجيال بالحسكة: أقراص عجين منقوشة، وبعضها محشي تمر.',
        en: 'Hasakah’s Eid sweet, handed down the generations: stamped pastry rounds, some filled with dates.',
      },
    },
  ],
}
