/** Usuario registrado en el dispositivo. Nunca se guarda la clave, solo su hash con sal. */
export interface StoredUser {
  username: string;
  salt: string;
  hash: string;
}
