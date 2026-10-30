// VietQR (NAPAS 247, EMVCo merchant-presented) payload for a bank transfer with fixed amount and reference.
// A QR only describes the transfer; it never proves payment was received.

const tlv = (id: string, value: string) => `${id}${value.length.toString().padStart(2, "0")}${value}`;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), uppercase hex. */
export function crc16ccitt(input: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(input)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function vietQrPayload(p: { bankBin: string; accountNo: string; amount: string; reference: string }): string {
  if (!/^\d{6}$/.test(p.bankBin) || !/^\d{1,19}$/.test(p.accountNo) || !/^\d{1,13}$/.test(p.amount)) throw new Error("invalid VietQR fields");
  if (!/^[A-Za-z0-9 ]{1,25}$/.test(p.reference)) throw new Error("reference must be ASCII alphanumeric, max 25");
  const merchant = tlv("00", "A000000727") + tlv("01", tlv("00", p.bankBin) + tlv("01", p.accountNo)) + tlv("02", "QRIBFTTA");
  const body =
    tlv("00", "01") + tlv("01", "12") + tlv("38", merchant) + tlv("53", "704") + tlv("54", p.amount) + tlv("58", "VN") + tlv("62", tlv("08", p.reference)) + "6304";
  return body + crc16ccitt(body);
}
