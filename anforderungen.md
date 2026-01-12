# Anforderungen.md - Frontend Kolla (Prototyp)

Dieses Dokument beschreibt die funktionalen Anforderungen an das Frontend für den Prototypen des kollaborativen Aufgabenmanagementsystems "Kolla".

## 1. Allgemeine Anforderungen
- **Technologie:** Web-Applikation (Responsive Design für verschiedene Devices) [file:1].
- **Architektur:** Strikte Trennung von GUI und Anwendungslogik. Das Frontend muss austauschbar sein [file:1].
- **Reaktivität:** Automatische Aktualisierung der Ansichten ohne manuelle Interaktion (z.B. bei Zuweisung neuer Aufgaben oder Statusänderungen) [file:1].
- **MVVM:** MVVM Pattern wird benutzt

---

## 1. View: Startseite
- Auswahl des Tenants (pro Workflowmanager existier ein Tenant, man kann also zwischen den workflowmanagern wählen)
- Auswahl des Users (ohne login, einfach user aus liste auswählen zum login) oder des managers
- Paar basic infos zu dem Programm

## 2. View: Akteur-Dashboard (Meine Aufgaben)
Diese Ansicht dient dem regulären Nutzer (Akteur) zur Organisation seiner Arbeit.

### Funktionen
- **Aufgabenliste:** Anzeige der dem Akteur zugewiesenen Aufgaben [file:1].
- **Priorisierung:**
  - Visuelle Darstellung der Priorität [file:1].
- **Aufgaben-Abschluss:** Möglichkeit, einen Arbeitsschritt als "erledigt" zu markieren. Der Schritt verschwindet daraufhin aus der Liste [file:1].
- **Darstellungsoptionen:** Der Nutzer muss zwischen mindestens zwei Darstellungsformen wählen können (z.B. Listenansicht vs. Diagramm/Kacheln) [file:1].

### Datenpunkte pro Eintrag
- Name/Beschreibung des Arbeitsschritts
- Zugehörige Gesamtaufgabe
- Deadline / Fertigstellungstermin
- Berechnete Dringlichkeit

---

## 3. View: Workflow-Manager 
Diese Ansicht dient dem Manager zur Überwachung des Gesamtfortschritts und zum ertsllen nuere akteure, rollen, workflows und aufgaben.

### Funktionen
- **Workflowübersicht:** Tabelle aller laufenden Workflows inlkusive Name, Status (wie viele aufgaben erledigt), Deadline
    - Möglichkeit zum erstellen neuer workflows
- **Aufgabenübersicht:** Liste aller laufenden Gesamtaufgaben je workflow beim auswählen eines workflows
    - Möglichkeit zum erstellen neuer Aufgaben für den workflow
- **Echtzeit-Updates:** Wenn ein Akteur einen Schritt erledigt, muss diese Ansicht sofort (live) aktualisiert werden oder eine Benachrichtigung anzeigen [file:1].
- **Akteurs-Auswahl:** Liste aller Akteuere
    - Einsicht in die individuelle Aufgabenliste jedes Akteurs [file:1].
    - **Manuelle Priorisierung:** Möglichkeit, die automatische Priorisierung eines Arbeitsschritts in der Liste eines Akteurs manuell zu überschreiben [file:1].
        - *Auswirkung:* Die Änderung muss sofort in der `View: Akteur-Dashboard` des betroffenen Nutzers sichtbar sein.
    - Möglichekti zum erstellen neuer Akteure
- **Rollenm:** Liste aller Rollen
    - Möglichkeit zum erstellen neuer rollen

## 5. Nicht-funktionale Anforderungen (GUI-relevant)
- **Performance:** Anzeige der individuellen Liste innerhalb von 0,5 Sekunden [file:1].
- **Usability:** Jederzeitiger Überblick über Aufgaben und Prioritäten ohne notwendige Interaktion (Live-Updates) [file:1].
