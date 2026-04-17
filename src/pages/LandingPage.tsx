import * as React from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  ArrowRight,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

type PlanChoice = "free" | "weekly" | "monthly";

export function LandingPage() {
  const { signInWithGoogle, session } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = React.useState<PlanChoice>("weekly");

  const handleGetStarted = async (plan: PlanChoice = "free") => {
    try {
      setSelectedPlan(plan);
      if (plan === "free") {
        window.sessionStorage.removeItem("designdistiller:selected-plan");
      } else {
        window.sessionStorage.setItem("designdistiller:selected-plan", plan);
      }
      await signInWithGoogle();
    } catch (error) {
      console.error("Landing page sign-in failed", error);
      toast.error("Sign-in could not start. Please try again.");
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (session) {
    navigate("/dashboard");
    return null;
  }

  const coreBenefits = [
    "Strip away mockups and product clutter",
    "Generate PNG and SVG prompt output",
    "Recreate cleaner standalone artwork",
    "Speed up print-on-demand design workflows",
  ];

  const visualPipeline = [
    {
      title: "Start with a clean dashboard and upload flow",
      description:
        "Open the tool and prepare a reference image for extraction.",
      image: "/landing/step1.jpg",
    },
    {
      title: "Drop in the product image or design reference",
      description:
        "Use a shirt graphic, tumbler design, listing image, or mockup.",
      image: "/landing/step2.jpg",
    },
    {
      title: "Generate the extracted design summary and prompt set",
      description:
        "Get the summary, PNG prompt, SVG prompt, and negative prompt.",
      image: "/landing/step3.jpg",
    },
    {
      title: "Refine the extracted output for production",
      description:
        "Edit the prompt, then take it into your preferred image generator for the cleaned result.",
      image: "/landing/step4.jpg",
    },
    {
      title: "Recreate the standalone printable artwork",
      description:
        "Generate a cleaner, more print-ready standalone artwork file.",
      image: "/landing/step5.jpg",
    },
  ];

  const useCases = [
    "Print-on-demand sellers who want to rebuild artwork from product listing images",
    "Designers who need AI prompts for PNG and SVG recreation without mockup clutter",
    "Creative studios that need design extraction from shirts, tumblers, mugs, wall art, and product photography",
    "Production teams that want faster prompt generation for original design development and workflow cleanup",
  ];

  const faqItems = [
    {
      question: "What does DesignDistiller do?",
      answer:
        "DesignDistiller is an AI design extraction tool that analyzes product mockups and listing photos to identify the real printable artwork. It then generates clean PNG and SVG prompt directions for recreating that design concept without the product background.",
    },
    {
      question: "Is DesignDistiller for print-on-demand sellers?",
      answer:
        "Yes. It is built for print-on-demand creators, Etsy sellers, merch designers, and production artists who need to extract artwork ideas from shirts, tumblers, mugs, and other product images quickly.",
    },
    {
      question: "Does it create print-ready prompt output?",
      answer:
        "Yes. The tool returns a design summary, a PNG-focused prompt, an SVG-friendly prompt, a negative prompt, and a file recommendation to help you produce cleaner artwork generation results.",
    },
    {
      question: "Can I manage or cancel my subscription?",
      answer:
        "Yes. Weekly and monthly subscribers can use the built-in Stripe customer portal to manage billing details, update payment methods, and cancel their subscription.",
    },
    {
      question: "What is the difference between weekly and monthly plans?",
      answer:
        "The weekly plan is designed for short bursts of work and includes 30 analyses per week. The monthly plan includes 150 analyses per month and is the better fit for active creators running a regular print design workflow.",
    },
  ];

  const pricingPlans = [
    {
      name: "Free",
      id: "free" as const,
      price: "$0",
      limit: "5 analyses/week",
      features: [
        "AI design extraction from mockups",
        "PNG and SVG prompt output",
        "5 analyses each week",
        "Best for testing the workflow",
      ],
      cta: "Get Started Free",
      highlighted: false,
    },
    {
      name: "Weekly",
      id: "weekly" as const,
      price: "$7",
      period: "/week",
      limit: "30 analyses/week",
      features: [
        "30 design analyses per week",
        "Ideal for launch weeks and batch work",
        "Full-quality prompt generation",
        "Manage or cancel anytime",
      ],
      cta: "Start Weekly",
      highlighted: true,
    },
    {
      name: "Monthly",
      id: "monthly" as const,
      price: "$15",
      period: "/month",
      limit: "150 analyses/month",
      features: [
        "150 design analyses per month",
        "Built for repeat sellers and active creators",
        "Best value for ongoing use",
        "Manage or cancel anytime",
      ],
      cta: "Go Monthly",
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-stone-950 text-stone-50">
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-stone-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-900/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Design<span className="text-indigo-400">Distiller</span>
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => scrollToSection("pricing")}
              className="hidden text-stone-300 hover:bg-white/5 hover:text-white sm:inline-flex"
            >
              Pricing
            </Button>
            <Button
              type="button"
              onClick={() => handleGetStarted("free")}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Sign In
            </Button>
          </motion.div>
        </div>
      </nav>

      <section className="relative px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(244,114,182,0.14),transparent_24%)]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto max-w-6xl"
        >
          <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-200">
                <ShieldCheck className="h-4 w-4" />
                AI design extraction for print-on-demand workflows
              </div>
              <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
                Design Distiller for mockup design extraction, PNG prompts, and SVG-ready artwork workflows
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-300 sm:text-xl">
                Upload a product mockup or listing image, isolate the real artwork, and generate cleaner PNG and SVG prompt output for print-ready design workflows.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => handleGetStarted("free")}
                  size="lg"
                  className="gap-2 bg-indigo-600 px-8 text-lg text-white hover:bg-indigo-500"
                >
                  Start Free <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollToSection("learn-more")}
                  className="border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
                >
                  Learn How It Works
                </Button>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {coreBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/4 p-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
                    <p className="text-sm leading-6 text-stone-200">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30">
              <div className="mb-4 flex items-center justify-between px-2">
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-300">Live workflow preview</span>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Upload {"->"} extract {"->"} recreate
                </span>
              </div>
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-stone-950">
                <img
                  src="/landing/preview3.webp"
                  alt="DesignDistiller dashboard showing a reference image upload and extracted prompt layout"
                  className="h-auto w-full object-cover"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section
        id="learn-more"
        className="border-y border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(99,102,241,0.08))] px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">What DesignDistiller does</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
                See the full pipeline from upload to recreated artwork
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-300">
                The tool identifies the printable artwork inside product photos, removes the product context, and returns prompt output you can actually use.
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
              <img
                src="/landing/step3.jpg"
                alt="DesignDistiller showing the extracted prompt workflow after analyzing a product image"
                className="h-auto w-full rounded-2xl border border-white/8 object-cover"
              />
            </div>
          </div>

          <div className="grid gap-5">
            {visualPipeline.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="grid overflow-hidden rounded-3xl border border-white/8 bg-white/4 lg:grid-cols-[1.05fr_0.95fr]"
              >
                <div className={cn("p-6 lg:p-7", index % 2 === 1 ? "lg:order-2" : "")}>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-300">Step {index + 1}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-stone-300">{item.description}</p>
                </div>
                <div className={cn("border-t border-white/8 bg-stone-950/40 p-4 lg:border-l lg:border-t-0", index % 2 === 1 ? "lg:order-1 lg:border-l-0 lg:border-r" : "")}>
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-auto w-full rounded-2xl border border-white/8 object-cover"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">Use cases</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
              Built for sellers, designers, and print production workflows
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl border border-white/8 bg-white/4 p-4"
              >
                <h3 className="text-lg font-semibold text-white">Use Case {index + 1}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-300">{item}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">Pricing</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">Simple plans for design analysis volume</h2>
            <p className="mt-5 text-lg leading-8 text-stone-300">
              Start free, test the weekly plan when you need a burst of artwork extraction, or move to monthly for a
              consistent print design workflow.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPlan(plan.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedPlan(plan.id);
                  }
                }}
                className={cn(
                  "rounded-3xl border p-8 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400/40",
                  selectedPlan === plan.id
                    ? "border-indigo-400 bg-indigo-500/10 ring-2 ring-indigo-500/30"
                    : plan.highlighted
                      ? "border-indigo-500/40 bg-indigo-500/8"
                      : "border-white/8 bg-white/4"
                )}
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                    <p className="mt-2 text-sm text-stone-400">{plan.limit}</p>
                  </div>
                  {selectedPlan === plan.id ? (
                    <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-100">
                      Selected
                    </span>
                  ) : null}
                </div>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  {plan.period ? <span className="ml-2 text-stone-400">{plan.period}</span> : null}
                </div>
                <Button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleGetStarted(plan.id);
                  }}
                  className={cn(
                    "mb-6 w-full",
                    selectedPlan === plan.id || plan.highlighted
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "bg-white/10 text-white hover:bg-white/15"
                  )}
                >
                  {plan.cta}
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6 text-stone-300">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/6 bg-white/[0.03] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">FAQ</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
              Frequently asked questions about DesignDistiller
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.question} className="rounded-2xl border border-white/8 bg-white/4 p-5">
                <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-indigo-400/20 bg-[linear-gradient(135deg,rgba(79,70,229,0.25),rgba(255,255,255,0.04))] px-8 py-12 text-center shadow-2xl shadow-black/20">
          <h2 className="text-4xl font-bold tracking-tight text-white">
            Start extracting artwork from product mockups in minutes
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-stone-200">
            Use DesignDistiller to turn product images into cleaner design prompts, faster production decisions, and a
            more repeatable AI design workflow.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              type="button"
              onClick={() => handleGetStarted(selectedPlan)}
              size="lg"
              className="gap-2 bg-white text-stone-950 hover:bg-stone-100"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => scrollToSection("pricing")}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              View Plans
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 px-4 py-8 text-center text-sm text-stone-400 sm:px-6 lg:px-8">
        <p>&copy; 2026 DesignDistiller. AI design extraction for creators, print-on-demand sellers, and production workflows.</p>
      </footer>
    </div>
  );
}
