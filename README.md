# Sledování spotřeby elektřiny

Jednoduchá webová aplikace pro sledování spotřeby elektřiny v domácnosti s rozlišením spotřeby tepelného čerpadla. Běží celá v prohlížeči -- žádné účty, servery ani instalace.

## Jak používat

### Krok 1: Otevřete aplikaci

Otevřete soubor `index.html` v libovolném webovém prohlížeči (Chrome, Firefox, Safari, Edge):

- **Windows**: Dvakrát klikněte na `index.html`, nebo pravým tlačítkem > Otevřít v programu > váš prohlížeč
- **Mac**: Dvakrát klikněte na `index.html`, nebo pravým tlačítkem > Otevřít v aplikaci > váš prohlížeč
- **Linux**: Dvakrát klikněte na `index.html` nebo spusťte `xdg-open index.html` v terminálu

### Krok 2: Nastavte cenu elektřiny

1. Přejděte do sekce **Nastavení**
2. Zadejte **cenu za kWh** z vašeho vyúčtování (výchozí: 6,00 Kč/kWh)
3. Klikněte na **Uložit nastavení**

Cenu najdete na vyúčtování od vašeho dodavatele (ČEZ, E.ON, PRE apod.).

### Krok 3: Zadávejte měsíční odečty

Vaše elektroměry ukazují kumulativní hodnoty (celkové kWh od instalace). Potřebujete dva odečty:

1. **Celkový elektroměr** -- celková spotřeba domácnosti (zahrnuje vše včetně tepelného čerpadla)
2. **Elektroměr TČ** -- spotřeba pouze tepelného čerpadla (je součástí celkového)

Každý měsíc:

1. Vyberte **měsíc**
2. Zadejte **celkový elektroměr** (např. `12345`)
3. Zadejte **elektroměr TČ** (např. `5678`)
4. Volitelně přidejte **poznámku**
5. Klikněte na **Přidat odečet**

Aplikace automaticky vypočítá:
- **Celková spotřeba** = rozdíl celkových odečtů
- **Spotřeba TČ** = rozdíl odečtů tepelného čerpadla (je součástí celkové)
- **Ostatní spotřeba** = celková - TČ
- **Náklady** = celková spotřeba × cena za kWh

### Krok 4: Sledujte data

Po zadání **2 a více odečtů** se automaticky zobrazí:

- **Přehledové karty** -- celková spotřeba, TČ, ostatní (s procentem z celku), náklady, denní průměr
- **Skládaný sloupcový graf** -- oranžově TČ, zeleně ostatní spotřeba, fialová čára nákladů
- **Tabulka** -- všechny odečty s rozpočtem spotřeby a nákladů

### Krok 5: Export dat

Klikněte na **Exportovat CSV** pro stažení dat ve formátu CSV (středníkový oddělovač, kódování UTF-8). Soubor otevřete v Excelu, Google Sheets nebo LibreOffice.

## Kde jsou data uložena?

Veškerá data jsou uložena v **localStorage** vašeho prohlížeče -- zůstávají na vašem počítači a nikam se neodesílají. Pokud smažete data prohlížeče, odečty se ztratí. Pravidelně používejte **Exportovat CSV** pro zálohu.

## Soubory

| Soubor       | Účel                                                |
| ------------ | --------------------------------------------------- |
| `index.html` | Hlavní stránka -- otevřete v prohlížeči             |
| `style.css`  | Vzhled aplikace (barvy, rozložení)                  |
| `app.js`     | Veškerá logika (výpočty, graf, ukládání)            |

## Řešení problémů

- **Graf se nezobrazuje?** Potřebujete alespoň 2 měsíční odečty.
- **Spotřeba ukazuje "N/A"?** Odečet je nižší než předchozí -- zkontrolujte čísla.
- **Odečet TČ vyšší než celkový?** Celkový elektroměr musí být vždy vyšší (zahrnuje i TČ).
- **Data zmizela?** Pravděpodobně jste smazali data prohlížeče. Používejte CSV export pro zálohu.
