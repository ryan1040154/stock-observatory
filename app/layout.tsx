import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Chipfolio｜盤後投資筆記',description:'台股庫存、法人籌碼與半導體隔夜市場',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-Hant"><body>{children}</body></html>;}
