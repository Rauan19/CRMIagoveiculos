function onlyDigits(value) {
  return String(value).replace(/\D/g, '')
}

function isValidCPF(cpf) {
  if (!cpf) return false
  const str = onlyDigits(cpf)
  if (str.length !== 11) return false
  // rejeita CPFs com todos dígitos iguais
  if (/^(\d)\1{10}$/.test(str)) return false

  const calcDigit = (digits) => {
    let sum = 0
    for (let i = 0; i < digits.length; i++) {
      sum += Number(digits[i]) * (digits.length + 1 - i)
    }
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }

  const d1 = calcDigit(str.slice(0, 9))
  const d2 = calcDigit(str.slice(0, 10))
  return d1 === Number(str[9]) && d2 === Number(str[10])
}

module.exports = {
  isValidCPF,
}

