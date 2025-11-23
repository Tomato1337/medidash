import { Button } from "@/shared/ui/button"
import { Field, FieldError, FieldGroup } from "@/shared/ui/field"
import { Checkbox } from "@/shared/ui/checkbox"
import { Link, useNavigate } from "@tanstack/react-router"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import InputLabel from "@/shared/ui/inputLabel"
import AuthCard from "@/shared/ui/authCard"
import { registerSchema, type RegisterForm } from "../model/schemas"
import { useRegister } from "../api/useRegister"
import { customToast } from "@/shared/lib/utils"

export default function RegisterPage() {
	const navigate = useNavigate()

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, dirtyFields },
	} = useForm<RegisterForm>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
			agreeToTerms: false,
		},
	})

	const mutateRegister = useRegister()

	const onSubmit = (data: RegisterForm) => {
		console.log(data)
		mutateRegister.mutate(data, {
			onSuccess: (data) => {
				customToast("Registration successful!", "success")
				console.log("Register success:", data)
				navigate({ to: "/dashboard" })
			},
		})
	}

	console.log(dirtyFields)

	return (
		<div className="flex h-full items-center justify-center">
			<div className="flex flex-1 items-center justify-center p-6 lg:justify-end lg:p-12">
				<div className="w-full max-w-md space-y-8">
					<div className="space-y-2 text-center">
						<h1 className="font-syne text-4xl font-bold">
							Create Account
						</h1>
						<p className="text-muted-foreground font-montserrat">
							Join medidash and start managing your health
							documents
						</p>
					</div>

					<form
						onSubmit={handleSubmit(onSubmit)}
						className="font-montserrat space-y-5"
					>
						<FieldGroup className="gap-4">
							<Field data-invalid={!!errors.name}>
								<div className="relative">
									<InputLabel
										type="text"
										placeholder=" "
										aria-invalid={!!errors.name}
										className="peer pt-6"
										label="Full Name"
										{...register("name")}
									/>
								</div>
								{errors.name && (
									<FieldError>
										{errors.name.message}
									</FieldError>
								)}
							</Field>

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

							<Field data-invalid={!!errors.confirmPassword}>
								<div className="relative">
									<InputLabel
										type="password"
										placeholder=" "
										aria-invalid={!!errors.confirmPassword}
										className="peer pt-6"
										label="Confirm Password"
										{...register("confirmPassword")}
									/>
								</div>
								{errors.confirmPassword && (
									<FieldError>
										{errors.confirmPassword.message}
									</FieldError>
								)}
							</Field>
						</FieldGroup>

						<Field
							data-invalid={!!errors.agreeToTerms}
							orientation="horizontal"
							className="gap-2"
						>
							<Controller
								name="agreeToTerms"
								control={control}
								render={({ field }) => (
									<Checkbox
										id="agreeToTerms"
										checked={field.value}
										onCheckedChange={field.onChange}
										ref={field.ref}
									/>
								)}
							/>
							<div className="text-secondary-foreground space-y-1">
								<label
									htmlFor="agreeToTerms"
									className="cursor-pointer text-sm select-none"
								>
									I agree to the{" "}
									<a
										href="#"
										className="hover:text-primary underline"
									>
										Terms and Conditions
									</a>
								</label>
								{errors.agreeToTerms && (
									<FieldError>
										{errors.agreeToTerms.message}
									</FieldError>
								)}
							</div>
						</Field>

						<Button
							type="submit"
							className="bg-primary hover:bg-primary/90 h-12 w-full rounded-xl text-lg font-semibold text-white"
						>
							Create Account
						</Button>

						<div className="flex items-center justify-center gap-2 pt-4">
							<hr className="border-muted-foreground flex-1 border-t-2" />
							<span className="text-muted-foreground text-sm">
								Already have an account?
							</span>
							<Link
								to="/auth/login"
								className="hover:text-primary text-secondary-foreground text-sm font-semibold underline transition-colors duration-200"
							>
								Login
							</Link>
							<hr className="border-muted-foreground flex-1 border-t-2" />
						</div>
					</form>
				</div>
			</div>

			<AuthCard isRegister />
		</div>
	)
}
