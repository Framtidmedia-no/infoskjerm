-- HTML som innholdstype: en selvstendig, sanert HTML-side (egen fil for stående
-- og liggende) som vises i en LÅST sandbox-iframe på skjermen — CSS-animasjon
-- kjører, men JavaScript kjøres aldri. Se docs/html-innhold-guide.md.
--
-- ALTER TYPE ... ADD VALUE legger kun til enum-verdien (ingen bruk i samme
-- migrasjon), så den er trygg her — samme mønster som 015/016/017/022/024.
alter type content_type add value if not exists 'html';
