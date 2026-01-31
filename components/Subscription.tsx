
import React, { useState } from 'react';

const plans = [
  {
    name: "Gratuito",
    price: "0",
    description: "Ferramentas essenciais para começar.",
    features: [
      "Chat Básico",
      "5 Imagens Padrão / dia",
      "Recomendações de Jogos",
      "Acesso à Comunidade"
    ],
    cta: "Plano Atual",
    highlight: false,
  },
  {
    name: "Pro",
    price: "29,90",
    description: "O melhor custo-benefício para gamers.",
    features: [
      "Respostas Rápidas",
      "50 Imagens HD / dia",
      "Criador de Avatar Desbloqueado",
      "Visão Computacional (Ilimitado)",
      "Sem Anúncios"
    ],
    cta: "Assinar Pro",
    highlight: true,
  },
  {
    name: "Elite",
    price: "59,90",
    description: "Poder total para criadores e pros.",
    features: [
      "Voz em Tempo Real (Ilimitado)",
      "Modelo Gemini 3 Pro (Pensamento)",
      "Assets 4K Ilimitados",
      "TheoryCraft Engine Avançado",
      "Acesso Antecipado a Betas"
    ],
    cta: "Assinar Elite",
    highlight: false,
  }
];

export const Subscription: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState<'method' | 'card_form' | 'pix' | 'processing' | 'success'>('method');
  
  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const handleSelectPlan = (plan: any) => {
    if (plan.price === "0") return;
    setSelectedPlan(plan);
    setPaymentStep('method');
  };

  const processPayment = () => {
    setPaymentStep('processing');
    // Simulate API call to Stripe/Gateway
    setTimeout(() => {
      setPaymentStep('success');
    }, 2500);
  };

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#0a0a0c]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 pt-8">
          <h2 className="text-primary font-bold text-sm uppercase tracking-wider mb-3">Planos e Preços</h2>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-6">
            UPGRADE YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">SYSTEM</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono text-sm">
            Escolha o plano ideal. Cancele a qualquer momento. Pagamento seguro via PIX ou Cartão.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, idx) => (
            <div 
              key={idx} 
              className={`relative flex flex-col p-8 rounded-2xl transition-all duration-300 ${
                plan.highlight 
                  ? 'bg-white/10 border-2 border-primary shadow-[0_0_30px_rgba(0,240,255,0.1)] scale-105 z-10' 
                  : 'bg-black/40 border border-white/10 hover:border-white/30'
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                  Recomendado
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-display font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-400 h-10">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-sm text-gray-500">R$</span>
                <span className="text-5xl font-display font-black text-white">{plan.price}</span>
                <span className="text-gray-500">/mês</span>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <svg className={`w-5 h-5 ${plan.highlight ? 'text-primary' : 'text-gray-500'} shrink-0`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleSelectPlan(plan)}
                className={`w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all ${
                plan.highlight 
                  ? 'bg-primary text-black hover:bg-white hover:shadow-[0_0_20px_#00f0ff]' 
                  : 'bg-white/10 text-white hover:bg-white hover:text-black'
              }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* --- CHECKOUT MODAL --- */}
        {selectedPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
             <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-white z-10"
                >
                  ✕
                </button>

                {/* Header */}
                <div className="bg-white/5 p-6 border-b border-white/10">
                   <h3 className="text-lg font-bold text-white uppercase tracking-wider">Checkout Seguro</h3>
                   <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-400">Plano {selectedPlan.name}</span>
                      <span className="font-bold text-lg text-primary">R$ {selectedPlan.price}</span>
                   </div>
                </div>

                <div className="p-8">
                   {/* Step 1: Select Method */}
                   {paymentStep === 'method' && (
                      <div className="space-y-4">
                         <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Forma de Pagamento</p>
                         
                         <button 
                           onClick={() => setPaymentStep('card_form')}
                           className="w-full p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4 hover:border-primary hover:bg-primary/10 transition-all group"
                         >
                            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center group-hover:text-primary text-xl border border-white/10">💳</div>
                            <div className="text-left">
                               <p className="font-bold text-white">Cartão de Crédito</p>
                               <p className="text-xs text-gray-500">Liberação imediata</p>
                            </div>
                         </button>

                         <button 
                           onClick={() => setPaymentStep('pix')}
                           className="w-full p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4 hover:border-success hover:bg-success/10 transition-all group"
                         >
                            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center group-hover:text-success text-xl border border-white/10">💠</div>
                            <div className="text-left">
                               <p className="font-bold text-white">PIX</p>
                               <p className="text-xs text-gray-500">Cai na hora (Desconto 5%)</p>
                            </div>
                         </button>
                         
                         <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-600 text-xs font-mono">OU GOOGLE PAY</span>
                            <div className="flex-grow border-t border-white/10"></div>
                         </div>

                         <button 
                           onClick={processPayment}
                           className="w-full py-4 bg-white text-black rounded-full font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                         >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/></svg>
                            Pagar com G Pay
                         </button>
                      </div>
                   )}

                   {/* Step 2: Card Form */}
                   {paymentStep === 'card_form' && (
                      <div className="space-y-4">
                         <input 
                           type="text" 
                           placeholder="Número do Cartão" 
                           value={cardNumber}
                           onChange={(e) => setCardNumber(e.target.value)}
                           className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-white font-mono placeholder-gray-600"
                         />
                         <input 
                           type="text" 
                           placeholder="Nome Impresso no Cartão" 
                           value={cardName}
                           onChange={(e) => setCardName(e.target.value)}
                           className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-white font-mono placeholder-gray-600"
                         />
                         <div className="flex gap-4">
                           <input 
                             type="text" 
                             placeholder="MM/AA" 
                             value={expiry}
                             onChange={(e) => setExpiry(e.target.value)}
                             className="w-1/2 p-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-white font-mono placeholder-gray-600"
                           />
                           <input 
                             type="text" 
                             placeholder="CVC" 
                             value={cvc}
                             onChange={(e) => setCvc(e.target.value)}
                             className="w-1/2 p-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-white font-mono placeholder-gray-600"
                           />
                         </div>
                         <button 
                           onClick={processPayment}
                           className="w-full py-4 bg-primary text-black rounded-xl font-bold hover:bg-white transition-colors shadow-neon"
                         >
                           Pagar R$ {selectedPlan.price}
                         </button>
                         <button onClick={() => setPaymentStep('method')} className="w-full text-center text-sm text-gray-500 hover:text-white">Voltar</button>
                      </div>
                   )}

                   {/* Step 2: PIX */}
                   {paymentStep === 'pix' && (
                      <div className="text-center space-y-4">
                         <div className="bg-white p-4 border border-gray-200 rounded-xl inline-block shadow-inner">
                            {/* Fake QR Code */}
                            <div className="w-48 h-48 bg-gray-900 flex items-center justify-center text-white text-xs font-mono">
                               [QR CODE PIX GERADO]
                            </div>
                         </div>
                         <p className="text-sm text-gray-400">Escaneie o QR Code acima ou copie a chave.</p>
                         <button onClick={processPayment} className="text-primary font-bold text-sm hover:underline">Copiar Chave PIX</button>
                         <div className="w-full bg-gray-800 h-1 rounded overflow-hidden">
                            <div className="h-full bg-primary w-2/3 animate-pulse"></div>
                         </div>
                         <p className="text-xs text-gray-600 font-mono">Aguardando confirmação do banco...</p>
                      </div>
                   )}

                   {/* Processing */}
                   {paymentStep === 'processing' && (
                      <div className="flex flex-col items-center justify-center py-8">
                         <div className="w-12 h-12 border-4 border-white/10 border-t-primary rounded-full animate-spin mb-4"></div>
                         <p className="font-bold text-white animate-pulse">Processando Transação...</p>
                      </div>
                   )}

                   {/* Success */}
                   {paymentStep === 'success' && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                         <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center text-3xl mb-4 border border-success/50">
                           ✓
                         </div>
                         <h3 className="text-2xl font-bold text-white mb-2">Sucesso!</h3>
                         <p className="text-gray-400 mb-6 text-sm">Sua assinatura <span className="text-white font-bold">{selectedPlan.name}</span> está ativa.</p>
                         <button 
                           onClick={() => setSelectedPlan(null)}
                           className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200"
                         >
                           Continuar
                         </button>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
