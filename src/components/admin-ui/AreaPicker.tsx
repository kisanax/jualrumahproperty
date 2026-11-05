"use client";

import { useEffect, useRef, useState } from "react";

const fieldLabelClass = "text-xs font-semibold text-muted-foreground";
const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const textInputClass =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

export type AreaPickerArea = {
  id: number;
  name: string;
  slug: string;
  level: number;
  parentId: number | null;
};

export type AreaPickerSelection = {
  areaId: number | null;
  kecamatanId: number | null;
  area: AreaPickerArea | null;
};

type AreaPickerProps = {
  value?: number | string | null;
  onChange: (selection: AreaPickerSelection) => void;
  maxLevel?: 3 | 4;
  required?: boolean;
  disabled?: boolean;
  idPrefix?: string;
};

async function fetchAreas(url: string, signal?: AbortSignal): Promise<AreaPickerArea[]> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Gagal memuat data wilayah");
  const data = (await response.json()) as { areas: AreaPickerArea[] };
  return data.areas;
}

export function AreaPicker({
  value,
  onChange,
  maxLevel = 4,
  required = false,
  disabled = false,
  idPrefix = "area",
}: AreaPickerProps) {
  const [provinces, setProvinces] = useState<AreaPickerArea[]>([]);
  const [cities, setCities] = useState<AreaPickerArea[]>([]);
  const [districts, setDistricts] = useState<AreaPickerArea[]>([]);
  const [villages, setVillages] = useState<AreaPickerArea[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [villageId, setVillageId] = useState("");
  const [villageQuery, setVillageQuery] = useState("");
  const [villageOpen, setVillageOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resolvedValue = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchAreas("/api/areas?level=1", controller.signal)
      .then(setProvinces)
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) setError("Gagal memuat provinsi");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const normalized = value === null || value === undefined || value === "" ? null : String(value);
    if (normalized === resolvedValue.current) return;

    if (normalized === null) {
      resolvedValue.current = null;
      const timeout = window.setTimeout(() => {
        setProvinceId("");
        setCityId("");
        setDistrictId("");
        setVillageId("");
        setVillageQuery("");
        setCities([]);
        setDistricts([]);
        setVillages([]);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const controller = new AbortController();
    fetchAreas(`/api/areas?id=${encodeURIComponent(normalized)}`, controller.signal)
      .then(async (chain) => {
        const province = chain.find((area) => area.level === 1);
        const city = chain.find((area) => area.level === 2);
        const district = chain.find((area) => area.level === 3);
        const village = chain.find((area) => area.level === 4);
        setProvinceId(province ? String(province.id) : "");
        setCityId(city ? String(city.id) : "");
        setDistrictId(district ? String(district.id) : "");
        setVillageId(maxLevel === 4 && village ? String(village.id) : "");
        setVillageQuery(maxLevel === 4 && village ? village.name : "");

        const [nextCities, nextDistricts] = await Promise.all([
          province ? fetchAreas(`/api/areas?level=2&parentId=${province.id}`, controller.signal) : [],
          city ? fetchAreas(`/api/areas?level=3&parentId=${city.id}`, controller.signal) : [],
        ]);
        setCities(nextCities);
        setDistricts(nextDistricts);
        setVillages(village ? [village] : []);
        // Tandai selesai hanya setelah seluruh hierarki berhasil dimuat.
        // React Strict Mode menjalankan setup/cleanup effect dua kali di
        // development; menandai sebelum fetch selesai membuat percobaan kedua
        // terlewati setelah percobaan pertama dibatalkan.
        resolvedValue.current = normalized;
      })
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) setError("Gagal memuat hierarki wilayah");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [maxLevel, value]);

  useEffect(() => {
    if (maxLevel !== 4 || !districtId || villageId) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const q = villageQuery.trim();
      fetchAreas(
        `/api/areas?level=4&parentId=${districtId}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
        controller.signal
      )
        .then(setVillages)
        .catch((err: unknown) => {
          if (!(err instanceof DOMException && err.name === "AbortError")) setError("Gagal mencari kelurahan/desa");
        });
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [districtId, maxLevel, villageId, villageQuery]);

  const clearAfterProvince = (nextProvinceId: string) => {
    setProvinceId(nextProvinceId);
    setCityId("");
    setDistrictId("");
    setVillageId("");
    setVillageQuery("");
    setDistricts([]);
    setVillages([]);
    resolvedValue.current = null;
    onChange({ areaId: null, kecamatanId: null, area: null });
    if (!nextProvinceId) return setCities([]);
    setLoading(true);
    fetchAreas(`/api/areas?level=2&parentId=${nextProvinceId}`)
      .then(setCities)
      .catch(() => setError("Gagal memuat kabupaten/kota"))
      .finally(() => setLoading(false));
  };

  const clearAfterCity = (nextCityId: string) => {
    setCityId(nextCityId);
    setDistrictId("");
    setVillageId("");
    setVillageQuery("");
    setVillages([]);
    resolvedValue.current = null;
    onChange({ areaId: null, kecamatanId: null, area: null });
    if (!nextCityId) return setDistricts([]);
    setLoading(true);
    fetchAreas(`/api/areas?level=3&parentId=${nextCityId}`)
      .then(setDistricts)
      .catch(() => setError("Gagal memuat kecamatan"))
      .finally(() => setLoading(false));
  };

  const selectDistrict = (nextDistrictId: string) => {
    const district = districts.find((area) => String(area.id) === nextDistrictId) || null;
    setDistrictId(nextDistrictId);
    setVillageId("");
    setVillageQuery("");
    setVillages([]);
    resolvedValue.current = district ? String(district.id) : null;
    onChange({ areaId: district?.id ?? null, kecamatanId: district?.id ?? null, area: district });
  };

  const selectVillage = (village: AreaPickerArea) => {
    setVillageId(String(village.id));
    setVillageQuery(village.name);
    setVillageOpen(false);
    resolvedValue.current = String(village.id);
    onChange({ areaId: village.id, kecamatanId: Number(districtId), area: village });
  };

  return (
    <div className="ui-area-picker" aria-busy={loading}>
      <div className="ui-area-picker__grid">
        <label className="grid gap-1.5" htmlFor={`${idPrefix}-province`}>
          <span className={fieldLabelClass}>Provinsi {required ? "*" : ""}</span>
          <select id={`${idPrefix}-province`} className={selectClass} value={provinceId} onChange={(event) => clearAfterProvince(event.target.value)} disabled={disabled} required={required}>
            <option value="">Pilih provinsi</option>
            {provinces.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5" htmlFor={`${idPrefix}-city`}>
          <span className={fieldLabelClass}>Kabupaten / Kota {required ? "*" : ""}</span>
          <select id={`${idPrefix}-city`} className={selectClass} value={cityId} onChange={(event) => clearAfterCity(event.target.value)} disabled={disabled || !provinceId} required={required}>
            <option value="">Pilih kabupaten/kota</option>
            {cities.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5" htmlFor={`${idPrefix}-district`}>
          <span className={fieldLabelClass}>Kecamatan {required ? "*" : ""}</span>
          <select id={`${idPrefix}-district`} className={selectClass} value={districtId} onChange={(event) => selectDistrict(event.target.value)} disabled={disabled || !cityId} required={required}>
            <option value="">Pilih kecamatan</option>
            {districts.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
        </label>
        {maxLevel === 4 && (
          <div className="ui-area-picker__autocomplete">
            <label className={fieldLabelClass} htmlFor={`${idPrefix}-village`}>Kelurahan / Desa (opsional)</label>
            <input
              id={`${idPrefix}-village`}
              className={textInputClass}
              value={villageQuery}
              placeholder={districtId ? "Cari kelurahan/desa" : "Pilih kecamatan dahulu"}
              disabled={disabled || !districtId}
              autoComplete="off"
              onFocus={() => setVillageOpen(true)}
              onBlur={() => window.setTimeout(() => setVillageOpen(false), 150)}
              onChange={(event) => {
                setVillageId("");
                setVillageQuery(event.target.value);
                setVillageOpen(true);
                const district = districts.find((area) => String(area.id) === districtId) || null;
                resolvedValue.current = district ? String(district.id) : null;
                onChange({ areaId: district?.id ?? null, kecamatanId: district?.id ?? null, area: district });
              }}
            />
            {villageOpen && districts.length > 0 && (
              <div className="absolute inset-x-0 top-full z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
                {villages.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Kelurahan/desa tidak ditemukan</div>
                ) : villages.map((area) => (
                  <button key={area.id} type="button" className="flex w-full cursor-default items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground" onMouseDown={(event) => { event.preventDefault(); selectVillage(area); }}>
                    {area.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
    </div>
  );
}
