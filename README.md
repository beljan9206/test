# Rozúčtování elektřiny – dva domy

Webová aplikace pro měsíční rozúčtování elektřiny mezi dva domy napojené na jednu přípojku. Dům 1 má FVE panely, Dům 2 používá tepelné čerpadlo. Běží celá v prohlížeči.

## Situace

- **Jedna elektrická přípojka** (jeden hlavní elektroměr na odběr ze sítě)
- **Dům 1** – napojený na přípojku, má **FVE panely** (solární elektrárnu)
- **Dům 2** – čerpá z Domu 1 (kombinace sítě a FVE), má **tepelné čerpadlo (TČ)**
- Cíl: měsíčně zaznamenávat hodnoty pro správné rozúčtování

## Měsíční odečty

Každý měsíc zadáte 6 hodnot (vše v kWh za daný měsíc, **nikoliv kumulativně**):

| Hodnota | Popis |
|---------|-------|
| **Odběr ze sítě** | Kolik elektřiny přišlo ze sítě (hlavní elektroměr) |
| **Dodávka do sítě** | Kolik přetoků z FVE odešlo zpět do sítě |
| **Výroba FVE** | Kolik vyrobily solární panely |
| **Dům 1** | Celková spotřeba Domu 1 |
| **Dům 2** | Celková spotřeba Domu 2 |
| **z toho TČ** | Spotřeba tepelného čerpadla (součást Domu 2) |

## Výpočet nákladů

Náklady se dělí **poměrně** podle spotřeby obou domů:

```
Náklady Dům 1 = (Dům 1 / (Dům 1 + Dům 2)) × Odběr ze sítě × Cena za kWh
Náklady Dům 2 = (Dům 2 / (Dům 1 + Dům 2)) × Odběr ze sítě × Cena za kWh
```

FVE výroba je tak automaticky poměrně sdílena – kdo spotřebuje víc, ten platí víc za síťovou elektřinu.

## Jak používat

1. Otevřete `index.html` v prohlížeči
2. V **Nastavení** zadejte cenu za kWh (výchozí: 6 Kč)
3. Každý měsíc vyplňte formulář se 6 hodnotami a klikněte **Přidat odečet**
4. Dashboard ukáže přehled, graf a tabulku s rozúčtováním
5. **Exportovat CSV** stáhne data do tabulky pro Excel

## Soubory

| Soubor | Účel |
|--------|------|
| `index.html` | Hlavní stránka |
| `style.css` | Vzhled |
| `app.js` | Logika a výpočty |

## Řešení problémů

- **TČ vyšší než Dům 2?** TČ je součástí spotřeby Domu 2, nemůže být vyšší.
- **Data zmizela?** Pravděpodobně smazána data prohlížeče. Používejte CSV export.
