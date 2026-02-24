import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Star, ShieldCheck, Clock, MapPin, CreditCard, CheckCircle2, Info } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { SERVICES } from '../data/mockData';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const BookingFlow: React.FC = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const service = SERVICES.find(s => s.id === serviceId) || SERVICES[0];
  
  const [step, setStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [address, setAddress] = useState('123, Green Valley, Sector 45, Gurgaon');

  const steps = ['Details', 'Schedule', 'Payment', 'Confirm'];

  const timeSlots = [
    '09:00 AM - 11:00 AM',
    '11:00 AM - 01:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    '06:00 PM - 08:00 PM',
  ];

  const pricingBreakdown = {
    base: service.basePrice,
    tax: Math.round(service.basePrice * 0.18),
    fee: 49,
    total: service.basePrice + Math.round(service.basePrice * 0.18) + 49
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="pt-28 pb-20 px-6 max-w-5xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-12">
        <div className="flex justify-between mb-4">
          {steps.map((s, i) => (
            <div key={i} className={`flex flex-col items-center gap-2 ${i + 1 <= step ? 'text-brand-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                i + 1 < step ? 'bg-brand-500 border-brand-500 text-white' : 
                i + 1 === step ? 'border-brand-500 text-brand-600' : 
                'border-slate-200 dark:border-slate-800'
              }`}>
                {i + 1 < step ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{s}</span>
            </div>
          ))}
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-brand-500"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="p-8">
                  <div className="flex items-start gap-6 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600">
                      <ShieldCheck size={40} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold dark:text-white mb-2">{service.name}</h2>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-yellow-500 font-bold">
                          <Star size={16} fill="currentColor" /> {service.rating}
                        </div>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 dark:text-slate-400">{service.reviewsCount} reviews</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold dark:text-white">What's included:</h3>
                    <ul className="space-y-3">
                      {['Professional deep cleaning', 'Eco-friendly chemicals', 'Post-service inspection', '30-day warranty'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                          <CheckCircle2 size={18} className="text-emerald-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>

                <Card className="p-8 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                  <div className="flex gap-4">
                    <Info className="text-blue-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-1">Cancellation Policy</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Free cancellation up to 3 hours before the service. After that, a ₹100 fee applies.</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold dark:text-white mb-6">Select Date & Time</h2>
                <div className="grid grid-cols-1 gap-4">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                        selectedSlot === slot 
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' 
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Clock size={20} />
                        <span className="font-bold">{slot}</span>
                      </div>
                      {selectedSlot === slot && <CheckCircle2 size={20} />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold dark:text-white mb-6">Payment Method</h2>
                <div className="space-y-4">
                  {[
                    { id: 'wallet', name: 'Servify Wallet', balance: '₹1,250', icon: <CreditCard /> },
                    { id: 'upi', name: 'UPI (GPay, PhonePe)', icon: <ChevronRight /> },
                    { id: 'card', name: 'Credit / Debit Card', icon: <CreditCard /> },
                    { id: 'cod', name: 'Cash after service', icon: <ChevronRight /> },
                  ].map((method) => (
                    <Card key={method.id} className="p-6 cursor-pointer hover:border-brand-500 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {method.id === 'wallet' ? <CreditCard className="text-brand-500" /> : <ChevronRight />}
                          </div>
                          <div>
                            <p className="font-bold dark:text-white">{method.name}</p>
                            {method.balance && <p className="text-xs text-emerald-500 font-bold">Balance: {method.balance}</p>}
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700"></div>
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 mx-auto mb-8">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-bold dark:text-white mb-4">Booking Confirmed!</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto">
                  Your service has been scheduled. You can track your technician live in the dashboard.
                </p>
                <Button size="lg" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
              </motion.div>
            )}
          </AnimatePresence>

          {step < 4 && (
            <div className="mt-12 flex justify-between">
              <Button variant="ghost" onClick={prevStep} disabled={step === 1}>Back</Button>
              <Button size="lg" onClick={nextStep} disabled={step === 2 && !selectedSlot}>
                {step === 3 ? 'Confirm Booking' : 'Continue'}
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar Summary */}
        {step < 4 && (
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              <Card className="p-8">
                <h3 className="text-lg font-bold dark:text-white mb-6">Price Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Item Total</span>
                    <span>₹{pricingBreakdown.base}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Taxes (GST 18%)</span>
                    <span>₹{pricingBreakdown.tax}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Service Fee</span>
                    <span>₹{pricingBreakdown.fee}</span>
                  </div>
                  <hr className="border-slate-200 dark:border-slate-800" />
                  <div className="flex justify-between text-xl font-bold dark:text-white">
                    <span>Total</span>
                    <span className="gradient-text">₹{pricingBreakdown.total}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-slate-50 dark:bg-slate-800/30 border-none">
                <div className="flex items-start gap-3">
                  <MapPin className="text-brand-500 shrink-0" size={20} />
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Service Address</p>
                    <p className="text-sm font-medium dark:text-white">{address}</p>
                    <button className="text-xs text-brand-600 font-bold mt-2 hover:underline">Change</button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
