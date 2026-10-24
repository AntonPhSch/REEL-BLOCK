# ReelBlock

Ein kleines Skript für Safari auf dem iPhone. Es entfernt die Kurzvideos aus Instagram, YouTube und TikTok. Der Rest der Seiten bleibt unverändert.

| Seite | Was verschwindet | Was bleibt |
|---|---|---|
| **Instagram** | Reels-Tab, Reels-Feed, Raster auf der Suchseite, Hashtag- und Orts-Treffer, vorgeschlagene Beiträge und Werbung | Storys und Beiträge von Freunden, Nachrichten, Profilsuche, Profile mit allen Beiträgen |
| **YouTube** (auch m.youtube.com) | Shorts-Knopf in der unteren Leiste, alle Shorts-Reihen; jede `/shorts/`-Adresse führt zur Startseite | alle normalen Videos |
| **TikTok** | alles | einzelne Videos, die dir geschickt wurden |

**Geschickte Reels:** Ein Reel, das du in den Nachrichten bekommst, kannst du öffnen und ansehen. Wischst du zum nächsten Reel, legt sich ein dunkler Vorhang über die Seite und das Video stoppt. Der Vorhang hat zwei Knöpfe: „Zurück zum Video“ und „Zur Startseite“.

---

## Warum JavaScript und nicht Python?

- iOS erlaubt **keiner** App, das Innere einer anderen App zu verändern. Den Reels-Tab in der echten Instagram-App kann also kein Programm ausblenden. Das gilt für Python, Swift und jede andere Sprache.
- Die **Webseiten** (instagram.com, youtube.com) in Safari kann man dagegen verändern. Code, der in einer Webseite läuft, muss JavaScript sein. Python läuft nicht im Browser.

Darum der Plan:
1. Die Instagram- und YouTube-**Apps** löschst oder sperrst du.
2. Du nutzt Instagram und YouTube in **Safari**. Dort entfernt dieses Skript die Kurzvideos.

---

## Einrichtung (ca. 5 Minuten)

1. **App installieren:** Lade im App Store die kostenlose App **„Userscripts“** (von Justin Wasack). Sie führt Skripte wie dieses in Safari aus.
2. **Ordner festlegen:** Öffne Userscripts und tippe auf „Set Userscripts Directory“. Wähle einen Ordner in der Dateien-App, z. B. `iCloud Drive/Userscripts`.
3. **Skript hineinlegen:** Kopiere `reelblock.user.js` in diesen Ordner, z. B. per AirDrop oder iCloud Drive. Der Dateiname muss auf `.user.js` enden.
4. **Erweiterung einschalten:** Gehe zu *Einstellungen → Apps → Safari → Erweiterungen → Userscripts*. Schalte sie ein und erlaube sie auf *instagram.com*, *youtube.com* und *tiktok.com*, oder einfach auf „Alle Websites“.
5. **Native Apps loswerden:**
   - Am einfachsten **löschst** du die Instagram-, YouTube- und TikTok-Apps.
   - Oder du sperrst sie über *Einstellungen → Bildschirmzeit → App-Limits → Limit hinzufügen*. Wähle die Apps, stelle 1 Minute ein und lege einen Bildschirmzeit-Code fest, den du nicht kennst, z. B. von einem Freund.
   - Wichtig: Ist die App noch installiert, öffnen Links oft automatisch die App statt Safari.
6. **Testen:** Öffne `instagram.com` in Safari und melde dich an. Der Reels-Tab unten sollte fehlen.

> Tipp: Nutze Instagram in einem normalen Safari-Tab und **nicht** als Symbol auf dem Home-Bildschirm („Zum Home-Bildschirm“). In solchen Web-Apps laufen Safari-Erweiterungen nicht.

---

## Einstellungen ändern

Ganz oben im Skript steht:

```js
const SPERREN = {
  instagram: true,
  youtube:   true,
  tiktok:    true,
};
```

Mit `false` statt `true` bleibt die Seite unverändert. Danach speichern und die Seite in Safari neu laden.

---

## So funktioniert der Code

Das Skript hat sieben Teile. Jeder ist im Code mit einer großen Überschrift markiert.

### 1. Einstellungen
Welche Seiten gesperrt werden (siehe oben).

### 2. Regeln pro Seite
Für jede Seite gibt es bis zu vier Dinge:

- **`css`**: eine Liste von Elementen, die unsichtbar werden (`display: none`). So verschwinden z. B. der Reels-Knopf oder die Shorts-Reihen. Die Namen wie `a[href="/reels/"]` heißen *CSS-Selektoren*. Dieser hier bedeutet: „jeder Link, der auf /reels/ zeigt“.
- **`umleiten`**: bekommt die aktuelle Adresse, z. B. `/reels/`, und entscheidet:
  - `null`: Seite ist erlaubt
  - eine Adresse: dorthin weiterleiten (Reels-Feed → Startseite, Short → YouTube-Startseite)
  - `"SPERRE"`: Sperrbild zeigen (bei TikTok)
- **`video`**: erkennt, ob die Adresse ein einzelnes Kurzvideo ist, und gibt dessen ID zurück. Beispiel: `/reel/ABC123/` ergibt `ABC123`.
- **`einVideoBereich`**: wo nur **ein** Video laufen darf. Bei Instagram sind das Reel-Seiten und die Nachrichten (siehe Teil 6).
- **`aufraeumen`**: läuft ständig mit, für Dinge, die CSS allein nicht kann. Auf Instagram versteckt es die leere Hülle um den Reels-Knopf und Beiträge mit „Vorgeschlagen“ oder „Gesponsert“.

Die Zeichenketten wie `/^\/reels\/?$/` sind *reguläre Ausdrücke*, also Suchmuster für Text. `^` heißt Anfang, `$` heißt Ende, `\/` ist ein Schrägstrich und `?` heißt „darf fehlen“. `/^\/reels\/?$/` passt also genau auf `/reels` und `/reels/`.

### 3. Start
Das Skript schaut, auf welcher Seite es gerade läuft (`location.hostname`). Ist die Seite eingeschaltet, fügt es sofort das CSS ein, noch bevor die Seite fertig geladen ist. So blitzen die Reels nicht kurz auf.

### 4. Sperrbild
Eine Funktion, die einen schwarzen Vorhang mit ✋ und Knöpfen über die ganze Seite legt.

### 5. Hauptschleife: der wichtigste Teil
Instagram und YouTube laden neue Seiten, ohne Safari wirklich neu zu laden. Das Skript bekommt das nicht automatisch mit. Darum schaut es **alle 0,3 Sekunden** nach, ob sich die Adresse geändert hat. Wenn ja:

1. **Verbotene Seite?** Dann weiterleiten oder sperren.
2. **Einzelnes Video?** Dann gilt die „Ein-Video-Regel“:
   - Du kommst von einer normalen Seite (Nachrichten, Profil, Startseite) zu einem Video: **erlaubt**. Das Skript merkt sich dieses Video in `erlaubt`.
   - Danach kommt sofort ein **anderes** Video: Du hast weitergewischt. Das Video wird **gesperrt**, der Vorhang kommt.
   - Gehst du zurück zu einer normalen Seite, wird `erlaubt` gelöscht. Das nächste geschickte Reel darfst du wieder ansehen.

Bei YouTube braucht es diese Regel nicht: Jede Adresse mit `/shorts/` schickt dich direkt zur Startseite. Auch geschickte Shorts lassen sich deshalb nicht öffnen.

Die **mobile Seite m.youtube.com** ist anders gebaut als die Computer-Version. Darum sucht `aufraeumen` dort zusätzlich nach allem, was „Shorts“ heißt (z. B. der Knopf in der unteren Leiste) oder auf `/shorts/` verlinkt, und versteckt es.

### 6. Video-Wächter: zweite Sicherung
Auf dem Handy ändert Instagram beim Weiterwischen oft **nicht** die Adresse. Dann merkt Teil 5 nichts. Deshalb achtet das Skript zusätzlich darauf, **welches Video startet**. Jedes Mal, wenn ein Video losläuft, meldet der Browser das Ereignis `play`.

- Das **erste sichtbare** Video in den Nachrichten oder auf einer Reel-Seite darf laufen. Das Skript merkt es sich in `erstesVideo`.
- Startet danach ein **anderes** Video, wird es sofort gestoppt und der Vorhang kommt.
- Videos, die Instagram unsichtbar im Hintergrund vorlädt, werden still gestoppt.
- Wird das erste Video geschlossen (es verschwindet von der Seite), oder gehst du auf eine andere Seite, wird `erstesVideo` gelöscht. Das nächste geschickte Reel geht dann wieder.

Auf der Startseite und auf Profilen gilt der Wächter nicht. Videos von Freunden im Feed laufen normal.

### 7. Wisch-Sperre: dritte Sicherung
Auf einer Reel-Seite (`/reel/...`) blockiert das Skript das senkrechte Wischen mit dem Finger (`touchmove` → `preventDefault()`). Ausgenommen sind Kommentarfenster und Eingabefelder, dort kannst du weiter scrollen und tippen.

---

## Grenzen und Fehlerbehebung

- **Instagram und YouTube ändern ihre Webseiten manchmal.** Taucht ein Reels-Knopf oder eine Shorts-Reihe wieder auf, passt ein Selektor nicht mehr. Lösung: Mit Safari auf dem Mac die Seite öffnen und das Element per Rechtsklick → „Element untersuchen“ ansehen. Dann den neuen Namen in die `css`-Liste eintragen.
- **Vorgeschlagene Beiträge** werden über den Text „Vorgeschlagen“, „Suggested“, „Gesponsert“ oder „Sponsored“ erkannt. Bei anderer Sprache musst du das Wort in `aufraeumen` ergänzen.
- **Auf einer Reel-Seite kannst du nicht nach unten scrollen**, das verhindert die Wisch-Sperre. Kommentare öffnest du über das Sprechblasen-Symbol.
- **Kommt der Vorhang beim ersten Reel fälschlich**, z. B. weil Instagram etwas anders lädt: Tippe „Zurück zum Video“. Hilft das nicht, sag Bescheid.
- **Hashtags in Bildunterschriften** von Freunden führen zur (leeren) Suchseite, weil Hashtag-Seiten gesperrt sind.
- **Die Sperre lässt sich umgehen**, wenn du das Skript ausschaltest. Das Skript ist eine Hilfe für deine Selbstdisziplin, kein Tresor.
- Das Skript wurde **nicht** auf einem echten iPhone getestet. Bitte probiere es aus und sag Bescheid, was nicht klappt.

---

## Dateien

| Datei | Inhalt |
|---|---|
| `reelblock.user.js` | das Skript (ca. 210 Zeilen, davon viele Notizen) |
| `README.md` | diese Anleitung |

## Funktioniert das Skript auf YouTube nicht?

1. Öffne YouTube in Safari, tippe auf **„aA“** in der Adressleiste und dann auf **Userscripts**. Erlaube die Erweiterung für diese Seite. m.youtube.com zählt als eigene Seite.
2. Lade die Seite neu.
3. Möchtest du lieber die Computer-Version, tippe auf „aA“ → „Desktop-Website anfordern“. Das Skript funktioniert auf beiden Versionen.
