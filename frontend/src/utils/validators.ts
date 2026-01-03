// Utilitários de validação

/**
 * Valida CPF
 * @param cpf - CPF com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export const validateCPF = (cpf: string): boolean => {
  // Remove formatação
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false
  
  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  // Validação dos dígitos verificadores
  let sum = 0
  let remainder
  
  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false
  
  // Segundo dígito verificador
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false
  
  return true
}

/**
 * Valida CNPJ
 * @param cnpj - CNPJ com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export const validateCNPJ = (cnpj: string): boolean => {
  // Remove formatação
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false
  
  // Validação dos dígitos verificadores
  let length = cleanCNPJ.length - 2
  let numbers = cleanCNPJ.substring(0, length)
  const digits = cleanCNPJ.substring(length)
  let sum = 0
  let pos = length - 7
  
  // Primeiro dígito verificador
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false
  
  // Segundo dígito verificador
  length = length + 1
  numbers = cleanCNPJ.substring(0, length)
  sum = 0
  pos = length - 7
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false
  
  return true
}

/**
 * Valida Placa de Veículo (formato antigo: ABC1234 ou Mercosul: ABC1D23)
 * @param plate - Placa com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export const validatePlate = (plate: string): boolean => {
  // Remove formatação e converte para maiúsculo
  const cleanPlate = plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  
  // Formato antigo: 3 letras + 4 números (ABC1234)
  const oldFormat = /^[A-Z]{3}[0-9]{4}$/
  
  // Formato Mercosul: 3 letras + 1 número + 1 letra + 2 números (ABC1D23)
  const mercosulFormat = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/
  
  return oldFormat.test(cleanPlate) || mercosulFormat.test(cleanPlate)
}

/**
 * Valida email
 * @param email - Email para validar
 * @returns true se válido, false caso contrário
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida telefone brasileiro (celular ou fixo)
 * @param phone - Telefone com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '')
  // Celular: 11 dígitos (DDD + 9 dígitos)
  // Fixo: 10 dígitos (DDD + 8 dígitos)
  return cleanPhone.length === 10 || cleanPhone.length === 11
}

/**
 * Valida CEP
 * @param cep - CEP com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export const validateCEP = (cep: string): boolean => {
  const cleanCEP = cep.replace(/\D/g, '')
  return cleanCEP.length === 8
}

