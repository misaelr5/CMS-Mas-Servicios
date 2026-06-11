import { forwardRef } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

const SecondaryButton = forwardRef<HTMLButtonElement, ButtonProps>(function SecondaryButton(props, ref) {
  return <Button ref={ref} {...props} variant={props.variant ?? "secondary"} />;
});

export { SecondaryButton };
