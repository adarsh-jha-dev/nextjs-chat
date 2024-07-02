import Image from "next/image";
import React from "react";

type Props = {
  size?: number;
};

const LoadingLogo = ({ size = 100 }: Props) => {
  return (
    <div className="flex justify-center h-full w-full items-center">
      <Image
        src="/logo.svg"
        alt="loader-logo"
        width={size}
        height={size}
        className="animate-pulse duration-800"
      />
    </div>
  );
};

export default LoadingLogo;
