// "What to eat here" cards for dishes each city is known for (owner request 2026-10-27: the food is
// thin). Dishes only, no places: what it is, in a line. Names follow the city line in
// seed-content/cities.json; descriptions from published recipes and food writing (Mawdoo3 "أكلات
// دمشقية", Wikipedia dish pages). Photos are keys into photos.json (dish-*), free-licensed, and a
// photo of the dish, not of a particular restaurant.
import type { GuideVenue } from "./guide";

const d = (ar: string, en: string, noteAr: string, noteEn: string, photo?: string): GuideVenue => ({
  kind: "dish",
  name: { ar, en },
  note: { ar: noteAr, en: noteEn },
  photo,
});

export const DISHES_EXTRA: Record<string, GuideVenue[]> = {
  damascus: [
    d("فتة الحمص بالسمن", "Fatteh with chickpeas", "خبز مقمّر وحمص مسلوق، يتغطى بلبن وطحينة وثوم، ويُسقى بالسمن والصنوبر. فطور الجمعة.", "Toasted bread and chickpeas under yoghurt, tahini and garlic, finished with ghee and pine nuts. A Friday breakfast."),
    d("الشاكرية", "Shakriyeh", "لحم مطبوخ بالغار والهيل والقرفة، يُقدَّم في لبن مطبوخ، ويُزيَّن بالصنوبر المقلي.", "Meat cooked with bay, cardamom and cinnamon, served in cooked yoghurt with fried pine nuts."),
    d("الحرّاق إصبعو", "Harrak osbao", "عدس بني وعجين، مع بصل وخبز مقليين وكزبرة وثوم، وحموضة دبس الرمان.", "Brown lentils and dough with fried onion and bread, coriander, garlic and pomegranate molasses.", "dish-harak-osbao"),
    d("فول الصبح", "Morning foul", "فول مدمس بالزيت والليمون والكمون، يُؤكل بالخبز الحار من محلات الفوّال باكراً.", "Stewed fava beans with oil, lemon and cumin, eaten early with hot bread from the bean shops.", "dish-foul"),
    d("الكبة", "Kibbeh", "برغل ولحم مدقوق، محشية لحماً وصنوبراً، مقلية أو بالصينية أو باللبن.", "Pounded bulgur and meat stuffed with meat and pine nuts: fried, baked in a tray or cooked in yoghurt.", "dish-kibbeh"),
  ],
  aleppo: [
    d("المحمّرة", "Muhammara", "فليفلة حمراء وجوز ودبس رمان، مازة حلبية تُغمَّس بالخبز.", "Red pepper, walnut and pomegranate molasses: an Aleppo mezze for dipping.", "dish-muhammara"),
    d("الكبة النيّة", "Kibbeh nayyeh", "لحم نيء مدقوق مع برغل ناعم وبهار، يُقدَّم مع النعناع والبصل الأخضر.", "Raw pounded meat with fine bulgur and spice, served with mint and spring onion.", "dish-kibbeh-nayyeh"),
  ],
  latakia: [
    d("الصيّادية", "Sayadieh", "سمك ورز مطبوخان بمرق البصل المحمّر، يُرشّ فوقه اللوز والصنوبر.", "Fish and rice cooked in a browned-onion broth, topped with almonds and pine nuts.", "dish-sayadiyeh"),
    d("السمك المشوي", "Grilled fish", "سمك البحر على الفحم مع الطحينة والحامض.", "Sea fish over charcoal with tahini and lemon."),
  ],
  hama: [
    d("الكبة", "Kibbeh", "برغل ولحم مدقوق، محشية أو بالصينية، من موائد حماة الثابتة.", "Pounded bulgur and meat, stuffed or in a tray, a fixture of Hama tables.", "dish-kibbeh"),
    d("الفطائر", "Fatayer", "عجين محشي سبانخ أو جبنة أو لحمة، من أفران المدينة.", "Pastries filled with spinach, cheese or meat, from the city bakeries.", "dish-fatayer"),
  ],
  tartous: [
    d("خبز الصاج", "Saj bread", "رقائق عجين تُخبز على صاج محدّب فوق النار، في قرى الجبل.", "Thin dough baked on a domed iron over fire, in the mountain villages.", "dish-saj-bread"),
  ],
  daraa: [
    d("المنسف الحوراني", "Hauran mansaf", "رز أو برغل مع لحم مطبوخ باللبن، صحن العزائم في حوران.", "Rice or bulgur with meat cooked in yoghurt: the feast dish of Hauran.", "dish-mansaf"),
  ],
  suwayda: [
    d("المنسف", "Mansaf", "لحم باللبن فوق الرز أو البرغل، يُقدَّم في المضافات والمناسبات.", "Meat in yoghurt over rice or bulgur, served at gatherings and guest houses.", "dish-mansaf"),
  ],
  "deir-ez-zor": [
    d("الثريد", "Thareed", "خبز مقطّع يُسقى بمرق اللحم والخضار، من أقدم أطباق المنطقة.", "Torn bread soaked in meat and vegetable broth, one of the region's oldest dishes.", "dish-thareed"),
  ],
  hasakah: [
    d("أطباق البرغل", "Bulgur dishes", "البرغل المطبوخ باللحم أو بالبندورة، من قمح الجزيرة نفسها.", "Bulgur cooked with meat or tomato, from the Jazira's own wheat.", "dish-burghul"),
    d("خبز التنور", "Tannour bread", "خبز يُلصق على جدار تنور طيني حار، يُؤكل سخناً مع اللبن.", "Bread slapped onto the wall of a hot clay oven, eaten warm with yoghurt.", "dish-tannour-bread"),
  ],
  raqqa: [
    d("خبز التنور", "Tannour bread", "خبز يُلصق على جدار تنور طيني حار.", "Bread slapped onto the wall of a hot clay oven.", "dish-tannour-bread"),
  ],
};
