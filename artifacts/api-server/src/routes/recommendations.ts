import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { RecommendBaitsBody, RecommendBaitsResponse } from "@workspace/api-zod";
import { serializeProduct } from "../lib/catalogue";

const router: IRouter = Router();
router.post("/recommendations", async (req, res): Promise<void> => {
  const parsed = RecommendBaitsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Wybierz porę roku, przejrzystość wody i gatunek ryby." }); return; }
  const { season, water, fish } = parsed.data;
  const cold = season === "zima" || season === "jesien";
  const colors = water === "metna" ? ["Różowy", "Pomarańczowy"] : water === "czysta" ? ["Żółty", "Biały"] : ["Żółty", "Różowy"];
  const scents = cold ? ["Kryl", "Czosnek"] : fish === "karp" ? ["Ananas", "Truskawka"] : fish === "leszcz" ? ["Wanilia", "Czosnek"] : ["Truskawka", "Wanilia"];
  const all = await db.select().from(productsTable).where(eq(productsTable.category, "waftersy"));
  const matched = all.filter((p) => p.stock > 0 && colors.includes(p.color) && scents.includes(p.scent));
  const fishNames = { karp: "karpia", leszcz: "leszcza", karas: "karasia", lin: "lina" };
  const explanation = [
    water === "metna" ? "W mętnej wodzie wyraziste kolory pomagają wyróżnić przynętę." : water === "czysta" ? "W czystej wodzie zacznij od stonowanego żółtego lub białego waftersa." : "W lekko mętnej wodzie warto porównać żółty z kontrastowym różowym.",
    cold ? "W chłodniejszych porach roku sprawdź wyraziste nuty kryla i czosnku oraz oszczędne nęcenie." : `Na ${fishNames[fish]} proponujemy ${scents.join(" lub ").toLowerCase()}.`,
    "To wskazówki oparte na prostych regułach, nie gwarancja brań. Dopasuj rozmiar do haka i sprawdź zachowanie przynęty w wodzie.",
    matched.length ? "" : "Obecnie brak dostępnych produktów spełniających oba kryteria — zmień parametry lub wróć później.",
  ].filter(Boolean).join(" ");
  res.json(RecommendBaitsResponse.parse({ colors, scents, explanation, products: matched.slice(0, 6).map(serializeProduct) }));
});
export default router;
