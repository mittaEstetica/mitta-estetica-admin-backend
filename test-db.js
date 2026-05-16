import db from './src/database.js'

const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

async function run() {
  const transactions = await db.prepare('SELECT * FROM transactions').all();
  const currentMonthTransactions = transactions.filter((t) => {
    const [y, m] = t.date.split('-').map(Number);
    return y === currentYear && m - 1 === currentMonth;
  });

  const totalEntrada = currentMonthTransactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalEntradaPaga = currentMonthTransactions.filter(t => t.type === 'entrada' && t.paid).reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSaida = currentMonthTransactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSaidaNaoPaga = currentMonthTransactions.filter(t => t.type === 'saida' && !t.paid).reduce((sum, t) => sum + Number(t.amount), 0);

  console.log("Current month transactions:");
  console.log("Total Entrada:", totalEntrada);
  console.log("Total Entrada Paga:", totalEntradaPaga);
  console.log("Total Saida:", totalSaida);
  console.log("Total Saida Nao Paga (Contas a Pagar):", totalSaidaNaoPaga);

  const packages = await db.prepare('SELECT * FROM packages').all();
  const currentMonthPackages = packages.filter((p) => {
    const pDate = new Date(p.created_at);
    return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
  });
  const totalPackagePaid = currentMonthPackages.reduce((sum, p) => sum + Number(p.paid_value), 0);
  
  console.log("Total Package Paid Value:", totalPackagePaid);

  process.exit(0);
}
run();
