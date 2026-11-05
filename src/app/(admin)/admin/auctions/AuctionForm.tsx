"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Sparkles, Copy, Check } from "lucide-react";
import { emptyAuction, auctionInput, categories, auctionStatuses, cities, addCalendarMonths, parseAuctionMessage, effectiveStatus, type AuctionForm as FormValues } from "@/lib/auctions";
import type { AuctionView } from "@/lib/auction-records";
import { getMediaUrl } from "@/lib/media-url";
import "./auctions.css";
import { Input as UiInput } from "@/components/ui/input";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import { Card as UiCard } from "@/components/ui/card";
import { Button as UiButton } from "@/components/ui/button";
import { DetailHeader } from "@/components/admin-ui/DetailHeader";

type Props={initial?:AuctionView;preset?:Partial<FormValues>;properties:{id:string;code:string;address:string}[]};
export default function AuctionForm({initial,preset,properties}:Props) {
  const router=useRouter(); const [form,setForm]=useState<FormValues>({...emptyAuction,...preset,...initial});
  const [id,setId]=useState(initial?.id||""); const [raw,setRaw]=useState(initial?.sourceText||"");
  const [photos,setPhotos]=useState(initial?.photos||[]); const [pending,setPending]=useState<File[]>([]);
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [duplicate,setDuplicate]=useState("");
  const [copied,setCopied]=useState(false);
  useEffect(()=>{if(initial)return;try{const draft=sessionStorage.getItem("auction-wa-draft");if(draft){queueMicrotask(()=>{setRaw(draft);sessionStorage.removeItem("auction-wa-draft");});}}catch{}},[initial]);
  function update(key:keyof FormValues,value:string){setForm(prev=>{
    const next={...prev,[key]:value};
    if(key==="activeFrom"||key==="durationMonths") next.activeUntil=addCalendarMonths(next.activeFrom,Number(next.durationMonths));
    return next;
  });}
  function copyRaw() {
    if(!raw) return;
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  }
  function field(key:keyof FormValues,label:string,type="text",required=false){return <label key={key}><span>{label}{required?" *":""}</span><UiInput className="min-h-10 px-3 text-base md:text-sm" type={type} required={required} value={form[key]} onChange={e=>update(key,e.target.value)} inputMode={type==="number"||key==="limitPrice"||key==="depositAmount"?"numeric":undefined} min={type==="number"?1:undefined} max={key==="durationMonths"?120:undefined}/></label>;}
  function textarea(key:keyof FormValues,label:string){return <label className="auction-wide"><span>{label}</span><UiTextarea className="min-h-24 text-base md:text-sm" rows={4} value={form[key]} onChange={e=>update(key,e.target.value)}/></label>;}
  async function save(e:React.FormEvent){e.preventDefault();setError("");setMessage("");setDuplicate("");
    const result=auctionInput.safeParse({...form,sourceText:raw});
    if(!result.success){setError(result.error.issues[0].message);return;}
    setBusy(true); let recordId=id;
    try {
      const response=await fetch(recordId?`/api/auctions/${recordId}`:"/api/auctions",{method:recordId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result.data)});
      const data=await response.json();
      if(!response.ok){if(data.existingId)setDuplicate(data.existingId);throw new Error(data.error||"Gagal menyimpan catatan lelang");}
      recordId=data.id;setId(recordId);
      // Keep successful uploads and retry only the remainder if a photo fails.
      let remaining=[...pending];
      for(const file of pending){const body=new FormData();body.append("file",file);const res=await fetch(`/api/auctions/${recordId}/photos`,{method:"POST",body});const photo=await res.json();if(!res.ok)throw new Error(`Catatan tersimpan, tetapi: ${photo.error||"Upload foto gagal"}`);setPhotos(prev=>[...prev,photo.url]);remaining=remaining.slice(1);setPending(remaining);}
      setMessage("Data tersimpan. Masa aktif dan hasil lelang dicatat terpisah.");router.replace(`/admin/auctions/${recordId}`);router.refresh();
    } catch(err){setError(err instanceof Error?err.message:"Gagal menyimpan");} finally{setBusy(false);}
  }
  const status=effectiveStatus(form);
  const auctionBadgeCls: Record<string, string> = {
    DRAFT: "admin-badge-draft", SCHEDULED: "admin-badge-pending", ACTIVE: "admin-badge-active",
    EXPIRED: "admin-badge-suspended", CANCELLED: "admin-badge-archived", COMPLETED: "admin-badge-sold",
  };
  return <div className="auction-module auction-editor">
    {/* Crumb trail otomatis dari AdminShell (route non-UUID) — DetailHeader hanya judul/badge/deskripsi */}
    <DetailHeader
      title={id?"Detail sitaan & lelang":"Tambah sitaan & lelang"}
      badge={id ? (
        <span className={`admin-badge ${auctionBadgeCls[status] || "admin-badge-draft"}`}>
          {status==="SCHEDULED"?"Terjadwal":auctionStatuses[status as keyof typeof auctionStatuses]}
        </span>
      ) : undefined}
      description="Input fleksibel Jabodetabek. Judul wajib; informasi lain dapat dilengkapi bertahap."
    />
    <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0 }}><Sparkles size={18}/> Smart Paste WhatsApp</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {raw && (
            <UiButton size="sm" variant="ghost" type="button" className="h-10 px-4" onClick={copyRaw} title="Salin pesan sumber">
              {copied ? <Check size={14} style={{ color: "#10b981" }}/> : <Copy size={14}/>}
              {copied ? "Tersalin" : "Salin Pesan"}
            </UiButton>
          )}
          <span style={{ fontSize: 12, color: "var(--color-admin-text-secondary)" }}>
            {raw.length > 0 ? `${raw.length} karakter` : "Kosong"}
          </span>
        </div>
      </div>
      <label>
        <span>Pesan asli dari sumber (tersimpan untuk arsip & peninjauan operator)</span>
        <UiTextarea className="min-h-24 text-base md:text-sm" rows={6} maxLength={16000} value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Tempel satu pesan properti / lelang di sini…"/>
      </label>
      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <UiButton variant="outline" type="button" disabled={busy||!raw.trim()} className="h-10 px-4" onClick={()=>{
          const extracted = parseAuctionMessage(raw);
          setForm(prev => {
            const next = { ...prev, ...extracted };
            if (next.activeFrom && next.durationMonths) {
              next.activeUntil = addCalendarMonths(next.activeFrom, Number(next.durationMonths));
            }
            return next;
          });
          setMessage("Ekstraksi awal selesai. Periksa lokasi, harga, deposit, dan tanggal sebelum menyimpan.");
        }}>
          <Sparkles size={16}/> Ekstrak ke formulir
        </UiButton>
        <span style={{ fontSize: 13, color: "var(--color-admin-text-secondary)", flex: 1, minWidth: 200 }}>
          Ekstraksi lokal membaca label Harga, Deposit, Penyelenggara, Bank, Lokasi, dan Masa aktif. Catatan hasil lelang tetap diisi manual.
        </span>
      </div>
    </UiCard>
    {error&&<div className="auction-notice" role="alert">{error}{duplicate&&<Link href={`/admin/auctions/${duplicate}`}> Buka catatan yang sudah ada →</Link>}</div>}
    {message&&<p role="status" className="auction-notice">{message}</p>}
    <form onSubmit={save}>
    <fieldset disabled={busy} className="auction-fieldset">
    <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]"><h2>Properti & lokasi</h2><div className="auction-fields">
      {field("title","Judul properti","text",true)}
      <label><span>Kategori</span><select className="admin-input" value={form.category} onChange={e=>update("category",e.target.value)}>{Object.entries(categories).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label><span>Jenis properti</span><select className="admin-input" value={form.propertyType} onChange={e=>update("propertyType",e.target.value)}><option value="HOUSE">Rumah</option><option value="APARTMENT">Apartemen</option><option value="LAND">Tanah</option><option value="SHOPHOUSE">Ruko</option></select></label>
      <label><span>Kota / kabupaten</span><UiInput className="min-h-10 px-3 text-base md:text-sm" list="auction-cities" value={form.city} onChange={e=>update("city",e.target.value)}/><datalist id="auction-cities">{cities.map(city=><option key={city} value={city}/>)}</datalist></label>
      {field("district","Kecamatan")}{textarea("address","Alamat / lokasi")}{textarea("specifications","Spesifikasi & sertifikat")}{textarea("description","Deskripsi")}
      <label className="auction-wide"><span>Tautkan properti yang sudah ada (opsional)</span><select className="admin-input" value={form.propertyId} onChange={e=>update("propertyId",e.target.value)}><option value="">Belum ditautkan</option>{properties.map(p=><option key={p.id} value={p.id}>{p.code} — {p.address.slice(0,90)}</option>)}</select></label>
      {form.propertyId&&<Link href={`/admin/properties/${form.propertyId}`}>Buka properti terkait →</Link>}
    </div></UiCard>
    <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]"><h2>Harga, deposit & sumber</h2><div className="auction-fields">{field("limitPrice","Nilai limit / harga (Rp)")}{field("depositAmount","Deposit / uang jaminan (Rp)")}{field("seller","Bank / penjual")}{field("organizer","Penyelenggara")}{field("contactName","Nama kontak / perantara")}{field("contactPhone","WhatsApp kontak","tel")}{field("sourceUrl","URL sumber resmi","url")}{textarea("termsNotes","Ketentuan dari sumber — perlu verifikasi")}</div></UiCard>
    <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]"><h2>Masa aktif & jadwal</h2><p>Status saat ini: {status==="SCHEDULED"?"Terjadwal":auctionStatuses[status as keyof typeof auctionStatuses]}. Tanggal berakhir berlaku sampai akhir hari WIB.</p><div className="auction-fields">
      <label><span>Status</span><select className="admin-input" value={form.status} onChange={e=>update("status",e.target.value)}>{Object.entries(auctionStatuses).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      {field("activeFrom","Mulai aktif","date")}{field("durationMonths","Durasi (bulan)","number")}{field("activeUntil","Berakhir (bisa disesuaikan)","date")}{field("depositDeadline","Batas setor deposit — WIB","datetime-local")}{field("auctionAt","Jadwal lelang — WIB","datetime-local")}{textarea("resultNotes","Hasil / konfirmasi penyelenggara")}
    </div><p>Listing aktif yang melewati batas waktu masuk review kedaluwarsa. Pemenang tidak ditetapkan otomatis.</p></UiCard>
    <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]"><h2>Foto properti</h2><p>JPG, PNG, WebP · maks. 10 MB per foto · hingga 30 foto. Foto pertama menjadi sampul.</p><div className="auction-photos">{photos.map(url=>{const mediaUrl=getMediaUrl(url);return <a key={url} href={mediaUrl} target="_blank" rel="noreferrer"><img src={mediaUrl} alt={form.title}/></a>;})}</div>
      <label><span>Tambah foto</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{const files=Array.from(e.target.files||[]);if(files.some(f=>f.size>10*1024*1024)||photos.length+pending.length+files.length>30){setError("Maksimal 30 foto, masing-masing 10 MB");return;}setPending(prev=>[...prev,...files]);e.target.value="";}}/></label>
      {pending.map((file,i)=><div className="auction-pending" key={`${file.name}-${i}`}><span>{file.name}</span><UiButton variant="outline" type="button" className="h-10 px-4" onClick={()=>setPending(prev=>prev.filter((_,j)=>j!==i))}>Batalkan</UiButton></div>)}
    </UiCard>
    <div className="auction-save"><UiButton variant="default" className="h-10 px-4" type="submit" disabled={busy}><Save size={18}/>{busy?"Menyimpan…":"Simpan catatan"}</UiButton></div>
    </fieldset></form>
  </div>;
}
