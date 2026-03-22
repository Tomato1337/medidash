import { Logo } from '@/shared/ui/logo'
import { Link } from "@tanstack/react-router"
import { 
	Search, 
	Bot, 
	Shield, 
	WifiOff, 
	Share2, 
	Zap, 
	ChevronDown, 
	ArrowRight,
	Menu,
	X,
	FileText,
	Activity,
	Lock
} from "lucide-react"
import { useState } from "react"

export function LandingPage() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

	const toggleFaq = (index: number) => {
		setOpenFaqIndex(openFaqIndex === index ? null : index)
	}

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen)
	}

	const features = [
		{
			icon: Search,
			title: "Умный поиск",
			description: "Находите нужные анализы и выписки с помощью семантического поиска, понимающего медицинские термины.",
		},
		{
			icon: Bot,
			title: "ИИ-анализ",
			description: "Автоматическое создание резюме документов, извлечение ключевых тегов и умная категоризация.",
		},
		{
			icon: Shield,
			title: "Приватность",
			description: "Надежная анонимизация персональных данных перед отправкой в облако или ИИ-модели.",
		},
		{
			icon: WifiOff,
			title: "Оффлайн-доступ",
			description: "Работайте с документами без интернета. Данные синхронизируются автоматически при подключении.",
		},
		{
			icon: Share2,
			title: "Безопасный обмен",
			description: "Делитесь записями с врачами через защищенные ссылки с паролем и ограниченным сроком действия.",
		},
		{
			icon: Zap,
			title: "Мгновенная обработка",
			description: "Загрузите PDF, фото или текст, и система моментально распознает и структурирует информацию.",
		},
	]

	const steps = [
		{
			icon: FileText,
			title: "Загрузите документы",
			description: "Добавьте PDF, изображения или текстовые файлы. Работает даже без интернета.",
		},
		{
			icon: Activity,
			title: "ИИ обработает автоматически",
			description: "Система извлечет текст, анонимизирует данные и создаст краткое содержание.",
		},
		{
			icon: Lock,
			title: "Ищите, анализируйте, делитесь",
			description: "Находите нужные документы мгновенно и безопасно делитесь ими с врачом.",
		},
	]

	const faqs = [
		{
			question: "Где хранятся мои медицинские данные?",
			answer: "Все ваши данные хранятся локально на вашем устройстве и синхронизируются с нашим защищенным сервером. Перед любой ИИ-обработкой персональные данные автоматически скрываются.",
		},
		{
			question: "Могу ли я пользоваться сервисом без интернета?",
			answer: "Да, Medidash поддерживает полноценную работу в оффлайн-режиме. Вы можете просматривать и добавлять документы, а обработка и синхронизация произойдут при появлении связи.",
		},
		{
			question: "Как работает умный поиск?",
			answer: "Мы используем современные нейросетевые технологии (семантический поиск). Система понимает смысл вашего запроса, а не просто ищет точные совпадения слов.",
		},
		{
			question: "Безопасно ли делиться документами с врачом?",
			answer: "Абсолютно. Вы можете создать специальную временную ссылку, защищенную паролем. Мы также ведем журнал доступа, чтобы вы знали, кто и когда открывал ваши документы.",
		},
	]

	return (
		<div className="flex min-h-screen flex-col font-montserrat selection:bg-primary/20 selection:text-primary">
			{/* Navbar */}
			<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
				<div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
					<Link to="/" className="flex items-center gap-2">
						<Logo size='medium' isLight/>
					</Link>

					{/* Desktop Nav */}
					<nav className="hidden md:flex items-center gap-8 top-0.5 relative">
						<a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
							Возможности
						</a>
						<a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
							Как это работает
						</a>
						<a href="#security" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
							Безопасность
						</a>
						<a href="#faq" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
							FAQ
						</a>
					</nav>

					<div className="hidden md:flex items-center">
						<Link 
							to="/dashboard" 
							className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							Панель управления
						</Link>
					</div>

					{/* Mobile Menu Button */}
					<button 
						className="md:hidden flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
						onClick={toggleMobileMenu}
						aria-label="Toggle menu"
					>
						{isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
					</button>
				</div>

				{/* Mobile Nav */}
				{isMobileMenuOpen && (
					<div className="md:hidden border-t border-border/40 bg-background px-4 py-4 shadow-lg">
						<nav className="flex flex-col gap-4">
							<a 
								href="#features" 
								className="block px-2 py-1 text-base font-medium text-muted-foreground hover:text-foreground"
								onClick={toggleMobileMenu}
							>
								Возможности
							</a>
							<a 
								href="#how-it-works" 
								className="block px-2 py-1 text-base font-medium text-muted-foreground hover:text-foreground"
								onClick={toggleMobileMenu}
							>
								Как это работает
							</a>
							<a 
								href="#security" 
								className="block px-2 py-1 text-base font-medium text-muted-foreground hover:text-foreground"
								onClick={toggleMobileMenu}
							>
								Безопасность
							</a>
							<a 
								href="#faq" 
								className="block px-2 py-1 text-base font-medium text-muted-foreground hover:text-foreground"
								onClick={toggleMobileMenu}
							>
								FAQ
							</a>
							<div className="mt-4 border-t border-border/40 pt-4">
								<Link 
									to="/dashboard" 
									className="block rounded-lg bg-primary px-2 py-2 text-center text-base font-medium text-primary-foreground hover:bg-primary/90"
									onClick={toggleMobileMenu}
								>
									Панель управления
								</Link>
							</div>
						</nav>
					</div>
				)}
			</header>

			<main className="flex-1 relative">
				{/* Ambient Background */}
				<div className="pointer-events-none absolute inset-0 -z-10 flex overflow-hidden">
					<div className="absolute -top-[20%] -left-[10%] h-[70vh] w-[70vw] rounded-full bg-primary/10 blur-[100px]" />
					<div className="absolute top-[20%] -right-[10%] h-[60vh] w-[60vw] rounded-full bg-secondary/30 blur-[100px]" />
				</div>

				{/* Hero Section */}
				<section className="relative px-4 pt-20 pb-32 sm:px-6 lg:px-8 lg:pt-32">
					<div className="container mx-auto max-w-5xl text-center">
						<div className="mx-auto mb-8 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm">
							<Zap className="mr-2 h-4 w-4" />
							<span>ИИ-ассистент для вашего здоровья</span>
						</div>
						<h1 className="font-syne text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
							Ваши медицинские <br className="hidden md:block" />
							документы <span className="text-primary">— под защитой ИИ</span>
						</h1>
						<p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
							Локальная, приватная и умная система управления медицинской историей. Загружайте анализы, а ИИ автоматически извлечет суть, расставит теги и найдет нужное.
						</p>
						<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
							<Link 
								to="/auth/register" 
								className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-8 font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-[1.02] sm:w-auto shadow-lg shadow-primary/25"
							>
								Начать бесплатно
								<ArrowRight className="ml-2 h-5 w-5" />
							</Link>
							<a 
								href="#features" 
								className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border bg-background px-8 font-medium text-foreground transition-all hover:bg-muted sm:w-auto"
							>
								Узнать больше
							</a>
						</div>
					</div>
				</section>

				{/* Features Section */}
				<section id="features" className="px-4 py-24 sm:px-6 lg:px-8 bg-muted/30 border-y border-border/40">
					<div className="container mx-auto max-w-7xl">
						<div className="mb-16 text-center">
							<h2 className="font-syne text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
								Возможности системы
							</h2>
							<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
								Инструменты профессионального уровня, адаптированные для личного использования.
							</p>
						</div>
						<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
							{features.map((feature, index) => (
								<div 
									key={index} 
									className="group relative overflow-hidden rounded-2xl border border-border bg-background p-8 transition-all hover:shadow-md hover:border-primary/30"
								>
									<div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
										<feature.icon className="h-6 w-6" />
									</div>
									<h3 className="mb-3 font-syne text-xl font-bold text-foreground">
										{feature.title}
									</h3>
									<p className="text-muted-foreground leading-relaxed">
										{feature.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* How It Works Section */}
				<section id="how-it-works" className="px-4 py-24 sm:px-6 lg:px-8">
					<div className="container mx-auto max-w-7xl">
						<div className="mb-16 text-center">
							<h2 className="font-syne text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
								Как это работает
							</h2>
							<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
								Три простых шага к полному контролю над медицинской историей.
							</p>
						</div>
						<div className="grid gap-12 lg:grid-cols-3">
							{steps.map((step, index) => (
								<div key={index} className="relative flex flex-col items-center text-center">
									{/* Connecting Line (Desktop) */}
									{index !== steps.length - 1 && (
										<div className="hidden lg:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-border/60 z-0" />
									)}
									
									<div className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center rounded-full border-8 border-background bg-muted text-primary shadow-sm">
										<step.icon className="h-10 w-10" />
									</div>
									<h3 className="mb-3 font-syne text-2xl font-bold text-foreground">
										Шаг {index + 1}
									</h3>
									<h4 className="mb-2 text-lg font-semibold text-foreground">
										{step.title}
									</h4>
									<p className="text-muted-foreground">
										{step.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Security Section */}
				<section id="security" className="px-4 py-24 sm:px-6 lg:px-8 bg-foreground text-background">
					<div className="container mx-auto max-w-7xl">
						<div className="grid gap-12 lg:grid-cols-2 lg:items-center">
							<div>
								<h2 className="font-syne text-3xl font-bold tracking-tight sm:text-4xl text-background">
									Ваши данные принадлежат только вам
								</h2>
								<p className="mt-6 text-lg text-muted leading-relaxed">
									Medidash построен на принципах Local-First архитектуры. Ваши медицинские документы в первую очередь сохраняются на вашем устройстве, а перед отправкой в ИИ-модель проходят строгую процедуру анонимизации.
								</p>
								<ul className="mt-8 space-y-4">
									<li className="flex items-center gap-3">
										<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
											<Shield className="h-4 w-4" />
										</div>
										<span className="text-background/90">Удаление ФИО, адресов и других личных данных (PII)</span>
									</li>
									<li className="flex items-center gap-3">
										<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
											<Lock className="h-4 w-4" />
										</div>
										<span className="text-background/90">Шифрование ссылок при обмене с врачом</span>
									</li>
									<li className="flex items-center gap-3">
										<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
											<Activity className="h-4 w-4" />
										</div>
										<span className="text-background/90">Полный аудит-лог доступов к вашим файлам</span>
									</li>
								</ul>
							</div>
							<div className="relative mx-auto w-full max-w-md">
								<div className="absolute inset-0 -translate-x-4 translate-y-4 rounded-2xl border border-primary/30 bg-primary/5"></div>
								<div className="relative rounded-2xl bg-card p-8 shadow-xl text-card-foreground">
									<div className="mb-6 border-b border-border/50 pb-4">
										<div className="flex items-center gap-3">
											<Shield className="h-8 w-8 text-primary" />
											<div>
												<div className="font-semibold">Анализ крови.pdf</div>
												<div className="text-sm text-muted-foreground">Обработка ИИ...</div>
											</div>
										</div>
									</div>
									<div className="space-y-3 font-mono text-sm">
										<div className="flex items-center gap-2 text-muted-foreground">
											<span>Пациент:</span>
											<span className="rounded bg-primary/10 px-2 py-0.5 text-primary line-through decoration-primary/50">Иванов И.И.</span>
											<span className="text-primary">→ [PERSON_1]</span>
										</div>
										<div className="flex items-center gap-2 text-muted-foreground">
											<span>Возраст:</span>
											<span className="rounded bg-primary/10 px-2 py-0.5 text-primary line-through decoration-primary/50">35 лет</span>
											<span className="text-primary">→ [AGE_1]</span>
										</div>
									</div>
									<div className="mt-6 flex items-center justify-center rounded-lg bg-green-500/10 py-2 text-sm font-medium text-green-600 dark:text-green-400">
										✓ Безопасно для облака
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* FAQ Section */}
				<section id="faq" className="px-4 py-24 sm:px-6 lg:px-8 bg-muted/30">
					<div className="container mx-auto max-w-3xl">
						<div className="mb-12 text-center">
							<h2 className="font-syne text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
								Частые вопросы
							</h2>
						</div>
						<div className="space-y-4">
							{faqs.map((faq, index) => (
								<div 
									key={index} 
									className="overflow-hidden rounded-2xl border border-border bg-background transition-colors"
								>
									<button
										className="flex w-full items-center justify-between px-6 py-5 text-left focus:outline-none"
										onClick={() => toggleFaq(index)}
										aria-expanded={openFaqIndex === index}
									>
										<span className="font-syne text-lg font-bold text-foreground">
											{faq.question}
										</span>
										<ChevronDown 
											className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180' : ''}`}
										/>
									</button>
									<div 
										className={`grid transition-all duration-300 ease-in-out ${openFaqIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
									>
										<div className="overflow-hidden">
											<p className="px-6 pb-5 text-muted-foreground leading-relaxed">
												{faq.answer}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* CTA Section */}
				<section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
					<div className="absolute inset-0 -z-10 bg-primary/5" />
					<div className="container mx-auto max-w-4xl text-center relative z-10">
						<h2 className="font-syne text-3xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
							Готовы взять здоровье под контроль?
						</h2>
						<p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
							Присоединяйтесь к Medidash и организуйте свои медицинские документы с помощью искусственного интеллекта.
						</p>
						<Link 
							to="/auth/register" 
							className="inline-flex h-14 items-center justify-center rounded-lg bg-primary px-10 text-lg font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-xl shadow-primary/20"
						>
							Создать аккаунт бесплатно
						</Link>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="border-t border-border/40 bg-background py-12">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
						<div className="col-span-1 lg:col-span-2">
							<Link to="/" className="flex items-center gap-2 mb-4">
								<Activity className="h-6 w-6 text-primary" />
								<span className="font-syne text-xl font-bold tracking-tight text-foreground">
									Medidash
								</span>
							</Link>
							<p className="text-muted-foreground max-w-sm mb-6">
								Локальная ИИ-система для управления медицинскими документами. Ваши данные — ваша приватность.
							</p>
						</div>
						<div>
							<h3 className="font-semibold text-foreground mb-4">Продукт</h3>
							<ul className="space-y-3">
								<li><a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Возможности</a></li>
								<li><a href="#security" className="text-muted-foreground hover:text-primary transition-colors">Безопасность</a></li>
								<li><Link to="/auth/login" className="text-muted-foreground hover:text-primary transition-colors">Вход</Link></li>
							</ul>
						</div>
						<div>
							<h3 className="font-semibold text-foreground mb-4">Правовая информация</h3>
							<ul className="space-y-3">
								<li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Политика конфиденциальности</a></li>
								<li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Условия использования</a></li>
							</ul>
						</div>
					</div>
					<div className="mt-12 border-t border-border/40 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
						<p className="text-sm text-muted-foreground">
							© {new Date().getFullYear()} Medidash. Все права защищены.
						</p>
						<p className="text-sm text-muted-foreground flex items-center gap-1">
							Сделано с <span className="text-destructive">♥</span> для вашего здоровья
						</p>
					</div>
				</div>
			</footer>
		</div>
	)
}
