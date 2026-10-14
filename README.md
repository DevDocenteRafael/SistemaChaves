# Reserva de Laboratórios e Espaços

Aplicação responsiva para consultar a disponibilidade e solicitar reservas de laboratórios e espaços acadêmicos da Faculdade Anhanguera. O projeto usa HTML, CSS e JavaScript estáticos e pode ser publicado no GitHub Pages.

## Executar localmente

Abra o `index.html` ou use a extensão Live Server no Visual Studio Code. A página inicial mantém a estrutura visual da Barbearia publicada, com apresentação do sistema e fotos dos espaços. O botão **Agendar sala** leva a `agendar.html`, onde são consultados os horários e preenchida a solicitação. Sem configurar a integração, as reservas ficam somente no armazenamento local do navegador e não são compartilhadas com outras pessoas.

## Conectar ao Google Sheets

1. Crie uma planilha Google e abra **Extensões > Apps Script**.
2. Copie o conteúdo de `integracao/Code.gs` para o editor do Apps Script associado à planilha.
3. Salve o projeto e implante como **App da Web**. O app deve executar como a conta proprietária da planilha. Restrinja o acesso à organização da faculdade, se essa opção estiver disponível.
4. Copie a URL da implantação e cole em `googleSheetsUrl` no arquivo `scripts/config.js`.
5. Reimplante ou atualize a implantação após qualquer alteração no Apps Script.
6. Teste a consulta de disponibilidade e o envio de uma reserva antes de publicar no GitHub Pages.

O Apps Script cria a aba `Reservas` e os cabeçalhos automaticamente. A verificação de conflito é feita novamente no Apps Script, sob bloqueio, antes de salvar; assim duas solicitações concorrentes para o mesmo espaço e período não são confirmadas.

Se a conta não oferecer acesso restrito à organização e a implantação precisar aceitar qualquer pessoa, o endereço do App da Web ficará acessível publicamente. A planilha não deve ser compartilhada publicamente; ainda assim, qualquer pessoa que acesse o site poderá enviar solicitações. Para restringir a reserva a professores autenticados, será necessário acrescentar uma solução de autenticação.

## Alterar as imagens

As fotos aparecem nos cartões da página inicial e na página de agendamento. Estão definidas na lista `rooms` em `scripts/config.js`. Para trocar somente as imagens, substitua os arquivos correspondentes em `assets/`, preservando os nomes já usados:

- `assets/corte1.png`
- `assets/corte2.png`
- `assets/corte3.png`

As imagens atuais são somente arquivos reaproveitados do projeto-base e devem ser substituídas pelas imagens dos espaços. Também é possível editar apenas os valores `image` da lista para apontar para arquivos novos dentro de `assets/`. Os textos alternativos correspondentes estão no campo `imageAlt`.

## Personalizar os espaços

O documento de requisitos não informa os nomes oficiais dos cinco ambientes; os nomes e descrições iniciais em `scripts/config.js` são exemplos. Atualize `id`, `name` e `description` nessa lista para corresponder aos espaços reais antes de publicar. Preserve os IDs se já houver reservas registradas na planilha, pois eles identificam cada ambiente.

O sistema permite agendamentos das 08h às 22h, em horários de uma hora. A disponibilidade exibida reflete as reservas registradas na planilha. Os campos de professor, disciplina, curso/turma, espaço, data, início, término e finalidade são obrigatórios e validados no navegador e no Apps Script.

## Estrutura

```text
├── assets/                   # Imagens dos espaços
├── integracao/
│   └── Code.gs               # Validação e integração com Google Sheets
├── scripts/
│   ├── config.js             # URL do Apps Script e dados dos espaços
│   ├── inicio.js             # Cartões de espaços da página inicial
│   ├── reservas.js           # Consulta, validação e envio das reservas
│   └── script.js             # Tema, fonte e controles de acessibilidade
├── styles/
│   ├── accessibilidade.css   # Componentes de acessibilidade
│   ├── home.css              # Ajustes da página inicial
│   ├── reservas.css          # Layout da aplicação de reservas
│   └── style.css             # Estilos originais da página Barbearia
├── index.html                # Apresentação do sistema no layout original
└── agendar.html              # Consulta de horários e formulário de reserva
```

## Publicar no GitHub Pages

Publique a pasta do projeto no repositório e habilite GitHub Pages para a branch e pasta desejadas. Configure primeiro a integração com a planilha e faça o teste do formulário na URL publicada, pois o acesso local e a implantação do GitHub Pages são origens diferentes.
