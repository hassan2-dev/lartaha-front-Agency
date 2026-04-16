import { Stepper, Step, StepLabel } from '@mui/material'

interface SignUpStepperProps {
  activeStep: number
  steps: string[]
}

export const SignUpStepper = ({ activeStep, steps }: SignUpStepperProps) => {
  return (
    <Stepper
      activeStep={activeStep}
      alternativeLabel
      sx={{
        mb: 8,
        direction: 'rtl',
        '& .MuiStepLabel-root .Mui-active': {
          color: 'primary.main',
        },
        '& .MuiStepLabel-root .Mui-completed': {
          color: 'success.main',
        },
        '& .MuiStepConnector-root': {
          direction: 'rtl',
        },
        '& .MuiStepConnector-line': {
          direction: 'rtl',
        },
      }}
    >
      {steps.map(label => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  )
}
