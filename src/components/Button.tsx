type ButtonProps = {
  text: string;
  onClick?: () => void;
};

export default function Button({ text, onClick }: ButtonProps) {
  return (
    <div className="w-full flex justify-center mt-4">
      <button 
        onClick={onClick}
        className="px-6 py-2 bg-white text-[#9990EC] font-bold rounded-full hover:bg-zinc-100 transition-colors shadow-md cursor-pointer"
      >
        {text}
      </button>
    </div>
  );
}