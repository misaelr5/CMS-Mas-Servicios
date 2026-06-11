import { forwardRef } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

const PrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(function PrimaryButton(props, ref) {
  return <Button ref={ref} {...props} variant={props.variant ?? "default"} />;
});

export { PrimaryButton };
