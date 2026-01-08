# 📊 Cloudinary - Limites do Plano Gratuito

## 🆓 Plano Free (Gratuito)

### Limites:
- ✅ **25 GB de armazenamento TOTAL** (não por mês, é o limite total acumulado)
- ✅ **25 GB de bandwidth/transferência por MÊS**
- ✅ **25.000 transformações de imagens por mês**

### O que significa:

**Armazenamento (25GB total):**
- Você pode ter até 25GB de fotos armazenadas
- Se cada foto for ~2MB, você pode ter ~12.500 fotos
- Isso é MUITO para começar! 

**Bandwidth (25GB/mês):**
- Quantidade de dados que pode ser baixada/carregada por mês
- Se seus usuários visualizarem 25GB de fotos no mês, esgota
- Mas considerando que fotos são otimizadas (menores), dá para bastante tráfego

**Transformações (25.000/mês):**
- Cada vez que você redimensiona, corta ou otimiza uma foto = 1 transformação
- 25.000 transformações/mês = muitas! 

---

## 💰 Se Precisar de Mais

### Plano Plus: $99/mês
- 100 GB armazenamento
- 100 GB bandwidth/mês
- 250.000 transformações/mês

### Plano Advanced: $224/mês
- 250 GB armazenamento
- 500 GB bandwidth/mês
- 5.000.000 transformações/mês

---

## 🎯 Para Seu CRM de Veículos

**Cálculo realista:**
- 100 veículos cadastrados
- 5 fotos por veículo = 500 fotos
- Foto média: 2MB = 1GB total

**Consumo:**
- Armazenamento: ~1GB de 25GB disponíveis (sobra MUITO!)
- Bandwidth: depende de quantos acessam, mas 25GB/mês é bastante
- Transformações: 500 fotos = ~500 transformações iniciais, depois só visualização

**Conclusão:** O plano gratuito é mais que suficiente para começar! 🎉

---

## 🔄 Alternativas se 25GB não for suficiente

### 1. AWS S3
- **Custo:** ~$0.023/GB armazenamento
- **Bandwidth:** ~$0.09/GB (primeiros 10TB)
- **Vantagem:** Muito barato, paga só o que usar
- **Desvantagem:** Mais complexo de configurar

### 2. ImgBB (Gratuito)
- 32MB por upload
- Sem limite de armazenamento total (mas removem fotos antigas/inativas)
- Melhor para testes/protótipos

### 3. Firebase Storage (Google)
- 5GB gratuitos
- $0.026/GB depois
- Integração fácil com outros serviços Google

### 4. Backblaze B2
- 10GB gratuitos
- Muito barato ($0.005/GB)
- Alternativa barata ao S3

---

## 💡 Recomendação

**Para começar:** Use Cloudinary gratuito
- ✅ Mais que suficiente para começar
- ✅ Fácil de implementar
- ✅ Quando crescer, migra para AWS S3 (mais barato em escala)

**Quando migrar:**
- Quando chegar em ~20GB armazenados
- Quando o bandwidth mensal esgotar frequentemente
- Quando quiser reduzir custos (S3 é mais barato em grande escala)

---

## 📝 Nota Importante

O limite de 25GB é de **armazenamento TOTAL**, não mensal. Isso significa:
- Você pode acumular até 25GB de fotos ao longo do tempo
- Não precisa "limpar" mensalmente
- É um limite permanente no plano gratuito

Para a maioria dos CRMs de veículos, 25GB dá para **anos** de uso! 🚀


