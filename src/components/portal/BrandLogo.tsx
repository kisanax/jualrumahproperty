import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/brand/jualrumahproperty-red.png";
import styles from "./BrandLogo.module.css";

export default function BrandLogo() {
  return (
    <Link href="/" className={styles.logo} aria-label="Jual Rumah Property — Beranda">
      <Image src={logo} alt="Jualrumahproperty.com — Propertinya Para Independen" priority className={styles.image} />
    </Link>
  );
}
