import { motion } from "motion/react";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const { signInWithGoogle, session } = useAuth();
  const navigate = useNavigate();

  if (session) {
    navigate("/dashboard");
    return null;
  }

  const features = [
    "Strip away product mockups instantly",
    "Generate print-ready artwork prompts",
    "Get PNG, SVG, and design recommendations",
    "Optimize for production workflows",
    "Perfect for print-on-demand creators",
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      limit: "3 analyses/month",
      features: [
        "Basic design analysis",
        "PNG and SVG prompts",
        "3 analyses per month",
        "Community support",
      ],
      cta: "Get Started Free",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$15",
      period: "/month",
      limit: "100 analyses/month",
      features: [
        "100 analyses per month",
        "Priority processing",
        "Advanced analytics",
        "Email support",
        "Early access to new features",
      ],
      cta: "Upgrade to Pro",
      highlighted: true,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-sm border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              DesignDistiller
            </span>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Button
              onClick={signInWithGoogle}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Sign In
            </Button>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl sm:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent">
            Transform Product Mockups Into Print-Ready Designs
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            DesignDistiller uses AI to analyze your product photos and extract
            the underlying artwork. Perfect for print-on-demand creators,
            designers, and artists who need production-ready designs in seconds.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              onClick={signInWithGoogle}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 gap-2"
            >
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
            >
              Learn More
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto"
          >
            <div>
              <div className="text-3xl font-bold text-purple-400">100%</div>
              <div className="text-gray-400">AI-Powered</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">&lt;10s</div>
              <div className="text-gray-400">Per Image</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">Free</div>
              <div className="text-gray-400">To Start</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black to-purple-950/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            What You Get
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 items-start"
              >
                <Check className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-300">{feature}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Simple Pricing</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className={`rounded-lg p-8 border transition-all ${
                  plan.highlighted
                    ? "border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20"
                    : "border-purple-500/20 bg-purple-950/10"
                }`}
              >
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-400 ml-2">{plan.period}</span>
                  )}
                  <p className="text-gray-400 text-sm mt-2">{plan.limit}</p>
                </div>
                <Button
                  onClick={signInWithGoogle}
                  className={`w-full mb-6 ${
                    plan.highlighted
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-purple-600/50 hover:bg-purple-600"
                  }`}
                >
                  {plan.cta}
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-2 text-gray-300">
                      <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-950 to-black border-t border-purple-500/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Extract Your Designs?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join creators, designers, and artists who are transforming their
            workflow with DesignDistiller.
          </p>
          <Button
            onClick={signInWithGoogle}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>
            &copy; 2024 DesignDistiller. Made for creators, by creators.
          </p>
        </div>
      </footer>
    </div>
  );
}
