# 🌸 DateDiner

Een mobiele app voor het organiseren van date-diners voor studentenverenigingen. Organisatoren kunnen een dineravond aanmaken, dispuutleden toevoegen en buitenstaanders koppelen aan een date.

---

## 📖 Concept

Een **date-diner** is een georganiseerde dineravond waarbij elke deelnemer een date heeft. De organisator (bijv. een dispuut) nodigt buitenstaanders uit die zich kunnen aanmelden voor een specifiek dispuutlid. De organisator beheert alle koppels en bevestigt de matches.

**Twee soorten gebruikers:**
- **Organisator** — maakt het diner aan, voegt dispuutleden toe en beheert verzoeken
- **Buitenstaander** — maakt een account aan, meldt zich aan voor een diner en vraagt om gekoppeld te worden aan een dispuutlid

---

## ✨ Features

- 🔐 Registreren & inloggen via Supabase Auth
- 🍽️ Diner aanmaken, bewerken en verwijderen
- 👥 Dispuutleden toevoegen met naam, studie en interesses
- 💌 Verzoekensysteem — buitenstaanders dienen een verzoek in voor een specifiek lid
- 💑 Koppelbeheer — organisator accepteert of wijst verzoeken af, koppels worden overzichtelijk weergegeven
- 👤 Profielpagina met bio, interesses, mijn diners en mijn verzoeken

---

## 🛠️ Tech Stack

| Onderdeel | Technologie |
|-----------|-------------|
| Framework | [Expo](https://expo.dev) SDK 54 + Expo Router |
| Taal | TypeScript |
| UI | React Native |
| Backend | [Supabase](https://supabase.com) (Auth + Database) |
| Navigatie | Expo Router (file-based) |

---

## 🗄️ Database Schema

### `profiles`
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Zelfde als auth.users.id |
| name | text | Naam van de gebruiker |
| bio | text | Korte bio |
| interests | text | Komma-gescheiden interesses |
| role | text | `'outsider'` (default) |

### `dinners`
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Primary key |
| name | text | Naam van het diner |
| date | date | Datum van het diner |
| location | text | Locatie |
| description | text | Beschrijving |
| org_id | uuid | FK → profiles.id (organisator) |

### `members`
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Primary key |
| dinner_id | uuid | FK → dinners.id (CASCADE) |
| name | text | Naam van het dispuutlid |
| study | text | Studie |
| tags | text[] | Interesses/tags |
| matched_to | uuid | FK → profiles.id (gekoppelde buitenstaander) |

### `requests`
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Primary key |
| dinner_id | uuid | FK → dinners.id (CASCADE) |
| member_id | uuid | FK → members.id |
| requester_id | uuid | FK → profiles.id |
| status | text | `'pending'` / `'accepted'` / `'rejected'` |

### Benodigde SQL

```sql
-- Cascade deletes instellen
ALTER TABLE members DROP CONSTRAINT members_dinner_id_fkey;
ALTER TABLE members ADD CONSTRAINT members_dinner_id_fkey
  FOREIGN KEY (dinner_id) REFERENCES dinners(id) ON DELETE CASCADE;

ALTER TABLE requests DROP CONSTRAINT requests_dinner_id_fkey;
ALTER TABLE requests ADD CONSTRAINT requests_dinner_id_fkey
  FOREIGN KEY (dinner_id) REFERENCES dinners(id) ON DELETE CASCADE;

-- Role kolom toevoegen aan profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'outsider';

-- RLS policies voor dinners
CREATE POLICY "Dinners zijn leesbaar" ON dinners FOR SELECT USING (true);
CREATE POLICY "Organisator mag updaten" ON dinners FOR UPDATE USING (auth.uid() = org_id);
CREATE POLICY "Organisator mag verwijderen" ON dinners FOR DELETE USING (auth.uid() = org_id);
```

---

## 🚀 Installatie & Setup

### Vereisten
- Node.js 18+
- Expo Go app op je telefoon ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))
- Een Supabase project

### 1. Repo clonen

```bash
git clone https://github.com/bramr03/CENA.git
cd CENA/datediner
```

### 2. Packages installeren

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is nodig vanwege dependency conflicten tussen sommige pakketten.

### 3. Environment variables instellen

Maak een `.env.local` bestand aan in de `datediner` map:

```env
EXPO_PUBLIC_SUPABASE_URL=jouw_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=jouw_supabase_anon_key
```

Je vindt deze waarden in je Supabase dashboard onder **Project Settings → API**.

### 4. App starten

```bash
npx expo start --clear
```

Scan de QR code met Expo Go op je telefoon. Zorg dat je telefoon op hetzelfde wifi netwerk zit als je computer.

---

## 🔑 Belangrijk voor nieuwe developers

- **`.env.local` staat niet in git** — vraag de Supabase credentials op bij een teamlid
- **`Alert`** werkt niet op Expo Web — gebruik inline bevestigingskaarten voor destructieve acties
- De app is primair gebouwd voor **mobiel via Expo Go**