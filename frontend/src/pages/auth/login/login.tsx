import { Button } from "@/shared/ui/button"
import { Field, FieldError, FieldGroup } from "@/shared/ui/field"
import { Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import InputLabel from "@/shared/ui/inputLabel"
import AuthCard from "@/shared/ui/authCard"
import { loginSchema, type LoginForm, useLogin } from "@/modules/auth"
import { customToast } from "@/shared/lib/utils"

export default function LoginPage() {
	const navigate = useNavigate()

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginForm>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	})

	const mutateLogin = useLogin()

	const onSubmit = (data: LoginForm) => {
		console.log(data)
		mutateLogin.mutate(data, {
			onSuccess: () => {
				navigate({ to: "/dashboard" })
			},
			onError: (error) => {
				console.error("Login error:", error)
				customToast(
					"Login failed. Please check your credentials and try again.",
					"error",
				)
			},
		})
	}

	return (
		<div className="flex h-full items-center justify-center">
			<AuthCard />

			{/* Right Side - Form */}
			<div className="flex flex-1 items-center justify-center p-6 lg:justify-start lg:p-12">
				<div className="w-full max-w-md space-y-8">
					<div className="space-y-2 text-center">
						<h1 className="font-syne text-4xl font-bold">
							Welcome Back
						</h1>
						<p className="text-muted-foreground font-montserrat">
							Log in to access your medical documents dashboard
						</p>
					</div>

					<form
						onSubmit={handleSubmit(onSubmit)}
						className="font-montserrat space-y-6"
					>
						<FieldGroup className="gap-4">
							<Field data-invalid={!!errors.email}>
								<div className="relative">
									<InputLabel
										type="email"
										placeholder=" "
										aria-invalid={!!errors.email}
										className="peer pt-6"
										label="Email"
										{...register("email")}
									/>
								</div>
								{errors.email && (
									<FieldError>
										{errors.email.message}
									</FieldError>
								)}
							</Field>

							<Field data-invalid={!!errors.password}>
								<div className="relative">
									<InputLabel
										type="password"
										placeholder=" "
										aria-invalid={!!errors.password}
										className="peer pt-6"
										label="Password"
										{...register("password")}
									/>
								</div>
								{errors.password && (
									<FieldError>
										{errors.password.message}
									</FieldError>
								)}
							</Field>
						</FieldGroup>

						<Button
							type="submit"
							className="bg-primary hover:bg-primary/90 h-12 w-full rounded-xl text-lg font-semibold text-white"
						>
							Login
						</Button>

						<div className="flex items-center justify-center gap-2 pt-4">
							<hr className="border-muted-foreground flex-1 border-t-2" />
							<span className="text-muted-foreground text-sm">
								Doesn't have an account?
							</span>
							<Link
								to="/auth/register"
								className="hover:text-primary text-secondary-foreground text-sm font-semibold underline transition-colors duration-200"
							>
								Register
							</Link>
							<hr className="border-muted-foreground flex-1 border-t-2" />
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}
