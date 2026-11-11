# OPORA Initial Disease Catalog — Source & Attribution Register

This register documents the provenance, authoritative clinical references, and rationale supporting each of the 12 disease entries and 54 total associations (49 Tier A binary matching associations, 5 Tier B qualified educational associations) in the OPORA Initial Disease Catalog (`data/opora-initial-disease-catalog-v1.json`).

All core disease information adheres to educational content published by the **U.S. National Library of Medicine (MedlinePlus Health Topics and MedlinePlus Medical Encyclopedia)**.

---

## 1. Disease Educational Source Provenance

| Disease Name | Primary Health Topic | Secondary Medical Encyclopedia | Primary Educational Attribution |
|---|---|---|---|
| **Common Cold** | [medlineplus.gov/commoncold.html](https://medlineplus.gov/commoncold.html) | [ency/article/000678.htm](https://medlineplus.gov/ency/article/000678.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Influenza (Flu)** | [medlineplus.gov/flu.html](https://medlineplus.gov/flu.html) | [ency/article/000080.htm](https://medlineplus.gov/ency/article/000080.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Acute Bronchitis** | [medlineplus.gov/acutebronchitis.html](https://medlineplus.gov/acutebronchitis.html) | [ency/article/001087.htm](https://medlineplus.gov/ency/article/001087.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Pneumonia** | [medlineplus.gov/pneumonia.html](https://medlineplus.gov/pneumonia.html) | [ency/article/000145.htm](https://medlineplus.gov/ency/article/000145.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Asthma** | [medlineplus.gov/asthma.html](https://medlineplus.gov/asthma.html) | [ency/article/000141.htm](https://medlineplus.gov/ency/article/000141.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Sinusitis** | [medlineplus.gov/sinusitis.html](https://medlineplus.gov/sinusitis.html) | [ency/article/000647.htm](https://medlineplus.gov/ency/article/000647.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Viral Gastroenteritis** | [medlineplus.gov/gastroenteritis.html](https://medlineplus.gov/gastroenteritis.html) | [ency/article/000252.htm](https://medlineplus.gov/ency/article/000252.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Migraine** | [medlineplus.gov/migraine.html](https://medlineplus.gov/migraine.html) | [ency/article/000709.htm](https://medlineplus.gov/ency/article/000709.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Dengue Fever** | [medlineplus.gov/dengue.html](https://medlineplus.gov/dengue.html) | [ency/article/001374.htm](https://medlineplus.gov/ency/article/001374.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Osteoarthritis** | [medlineplus.gov/osteoarthritis.html](https://medlineplus.gov/osteoarthritis.html) | [ency/article/000435.htm](https://medlineplus.gov/ency/article/000435.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Pink Eye (Conjunctivitis)** | [medlineplus.gov/pinkeye.html](https://medlineplus.gov/pinkeye.html) | [ency/article/001010.htm](https://medlineplus.gov/ency/article/001010.htm) | Source: MedlinePlus, National Library of Medicine. |
| **Allergic Rhinitis (Hay Fever)** | [medlineplus.gov/hayfever.html](https://medlineplus.gov/hayfever.html) | [ency/article/000813.htm](https://medlineplus.gov/ency/article/000813.htm) | Source: MedlinePlus, National Library of Medicine. |

---

## 2. Tier A: Approved Binary Matching Mappings (49 Entries)

These 49 relationships represent cardinal clinical presentations approved for relational database matching:

1. **Common Cold (3):**
   - Nasal congestion (`HP:0001742`): Stuffy nose / upper mucosal obstruction.
   - Cough (`HP:0012735`): Mucosal post-nasal drip irritation.
   - Headache (`HP:0002315`): Upper respiratory dull headache.
2. **Influenza (6):**
   - Fever (`HP:0001945`): Acute pyrexia (100°F–104°F).
   - Chills (`HP:0025143`): Shaking rigors and chills.
   - Fatigue (`HP:0012378`): Severe, sudden prostration.
   - Headache (`HP:0002315`): Intense cephalalgia.
   - Cough (`HP:0012735`): Dry, persistent cough.
   - Nasal congestion (`HP:0001742`): Upper airway rhinitis.
3. **Acute Bronchitis (4):**
   - Cough (`HP:0012735`): Persistent bronchial cough.
   - Productive cough (`HP:0031245`): Sputum / phlegm production.
   - Wheezing (`HP:0030828`): Expiratory airway narrowing.
   - Fatigue (`HP:0012378`): Subacute viral fatigue.
4. **Pneumonia (7):**
   - Fever (`HP:0001945`): High fever with diaphoresis.
   - Chills (`HP:0025143`): Rigors and shaking chills.
   - Productive cough (`HP:0031245`): Purulent / rust-colored sputum.
   - Chest pain (`HP:0100749`): Pleuritic chest pain worsening with respiration.
   - Nausea (`HP:0002018`): Documented systemic manifestation.
   - Vomiting (`HP:0002013`): Documented gastrointestinal manifestation.
   - Diarrhea (`HP:0002014`): Documented potential symptom (medlineplus.gov/pneumonia.html).
5. **Asthma (2):**
   - Wheezing (`HP:0030828`): Cardinal whistling expiratory sound.
   - Cough (`HP:0012735`): Recurrent irritative dry cough.
6. **Sinusitis (4):**
   - Nasal congestion (`HP:0001742`): Paranasal mucosal obstruction.
   - Cough (`HP:0012735`): Pharyngeal post-nasal drip.
   - Fatigue (`HP:0012378`): Subacute inflammatory malaise.
   - Headache (`HP:0002315`): Distinct headache documented in ency/000647.
7. **Viral Gastroenteritis (5):**
   - Diarrhea (`HP:0002014`): Watery stools.
   - Nausea (`HP:0002018`): Gastric distress.
   - Vomiting (`HP:0002013`): Emesis.
   - Abdominal pain (`HP:0002027`): Cramping pain.
   - Fever (`HP:0001945`): Low-grade fever.
8. **Migraine (3):**
   - Headache (`HP:0002315`): Unilateral pulsating headache.
   - Nausea (`HP:0002018`): Core autonomic symptom.
   - Vomiting (`HP:0002013`): Peak attack emesis.
9. **Dengue Fever (6):**
   - Fever (`HP:0001945`): Biphasic high fever (up to 40°C).
   - Headache (`HP:0002315`): Severe frontal/retro-orbital headache.
   - Nausea (`HP:0002018`): Acute systemic distress.
   - Vomiting (`HP:0002013`): Warning sign emesis.
   - Skin rash (`HP:0000988`): Maculopapular/petechial rash.
   - Fatigue (`HP:0012378`): Severe post-viral prostration.
10. **Osteoarthritis (5):**
    - Joint stiffness (`HP:0001387`): Morning / inactivity stiffness <30 min.
    - Knee pain (`HP:0030839`): Weight-bearing cartilage wear.
    - Hand pain (`HP:0046505`): Interphalangeal nodal arthritis.
    - Back pain (`HP:0003418`): Lumbar spine facet OA.
    - Neck pain (`HP:0030833`): Cervical spine facet OA.
11. **Pink Eye (Conjunctivitis) (1):**
    - Red eye (`HP:0025337`): Scleral and conjunctival vascular dilation.
12. **Allergic Rhinitis (Hay Fever) (3):**
    - Nasal congestion (`HP:0001742`): Allergic mucosal hypertrophy.
    - Red eye (`HP:0025337`): Allergic rhinoconjunctivitis.
    - Cough (`HP:0012735`): Chronic allergic post-nasal drip.

---

## 3. Tier B: Qualified Educational Associations (5 Entries)

1. **Pneumonia — Fatigue (`HP:0012378`):** Documented secondary constitutional symptom; retained for patient education narrative, excluded from binary matching.
2. **Pneumonia — Poor appetite (`HP:0004396`):** Variable systemic sign; retained for patient narrative description only.
3. **Migraine — Blurred vision (`HP:0000622`):** Transient aura phase symptom; excluded from binary matching to avoid misidentifying primary ophthalmic conditions.
4. **Migraine — Neck pain (`HP:0030833`):** Prodromal/postdromal symptom of trigeminocervical irritation; excluded from binary matching to prevent false matches for orthopedic neck strain.
5. **Allergic Rhinitis — Fatigue (`HP:0012378`):** Secondary daytime fatigue caused by nocturnal congestion and disrupted sleep.

---

## 4. Specific Exclusions & Clinical Rationales

* **Common Cold:** `Fatigue` excluded to prevent confusion with acute influenza.
* **Influenza:** `Muscle weakness` excluded (myalgia is inflammatory tenderness, not motor paresis) and `Poor appetite` excluded.
* **Acute Bronchitis & Asthma:** `Chest pain` excluded from both (chest tightness and bronchial soreness do not equate to chest pain).
* **Sinusitis:** `Ear pain` excluded (Eustachian fullness is secondary, not primary otalgia).
* **Viral Gastroenteritis:** `Poor appetite` excluded to keep focus on cardinal enteric triad.
* **Dengue Fever:** `Muscle weakness` and `Joint stiffness` excluded (breakbone pain is myalgia/arthralgia, not motor paresis or mechanical joint stiffness).
* **Osteoarthritis:** `Foot pain` excluded from core set (knee, hand, lumbar, and cervical spine are the primary sites).
* **Pink Eye:** `Blurred vision` excluded (transient crusting does not constitute true visual acuity impairment).
