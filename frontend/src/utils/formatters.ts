// Funções de formatação para campos de formulário

export const formatCPF = (value: string): string => {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '')
  
  // Aplica a máscara: 000.000.000-00
  if (digits.length <= 3) {
    return digits
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  } else if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  } else {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
  }
}

export const formatPhone = (value: string): string => {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '')
  
  // Aplica a máscara: (00) 00000-0000 ou (00) 0000-0000
  if (digits.length <= 2) {
    return digits.length > 0 ? `(${digits}` : digits
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  } else if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  } else {
    // Celular: (00) 00000-0000
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }
}

export const formatCEP = (value: string): string => {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '')
  
  // Aplica a máscara: 00000-000
  if (digits.length <= 5) {
    return digits
  } else {
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`
  }
}

export const formatPlate = (value: string): string => {
  // Remove tudo que não é letra ou dígito e converte para maiúsculo
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  
  // Aplica a máscara: ABC1234 ou ABC1D23 (Mercosul)
  if (cleaned.length <= 3) {
    return cleaned
  } else if (cleaned.length <= 4) {
    return `${cleaned.slice(0, 3)}${cleaned.slice(3)}`
  } else if (cleaned.length <= 7) {
    // Formato antigo: ABC1234
    const letters = cleaned.slice(0, 3)
    const numbers = cleaned.slice(3, 7)
    return `${letters}${numbers}`
  } else {
    // Formato Mercosul: ABC1D23
    const letters1 = cleaned.slice(0, 3)
    const number1 = cleaned.slice(3, 4)
    const letter2 = cleaned.slice(4, 5)
    const numbers2 = cleaned.slice(5, 7)
    return `${letters1}${number1}${letter2}${numbers2}`
  }
}

export const formatRG = (value: string): string => {
  // Remove tudo que não é dígito ou X
  const cleaned = value.replace(/[^0-9Xx]/g, '').toUpperCase()
  
  // Aplica a máscara: 00.000.000-0 ou 00.000.000-X
  if (cleaned.length <= 2) {
    return cleaned
  } else if (cleaned.length <= 5) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`
  } else if (cleaned.length <= 8) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`
  } else {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}-${cleaned.slice(8, 9)}`
  }
}

// Remove formatação (máscaras) para salvar no banco
export const removeMask = (value: string): string => {
  return value.replace(/\D/g, '')
}

