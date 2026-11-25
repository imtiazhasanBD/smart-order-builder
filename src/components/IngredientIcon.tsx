import React, { useState } from 'react';

/**
 * Modern, razor-sharp Food & Ingredient Vector Icons (Fluent UI Flat SVG standard).
 * Stored locally as lightweight SVGs in /icons/ingredients/ for instant zero-latency loading.
 */
export const INGREDIENT_ICON_MAP: Record<string, { src: string; label: string; emoji: string }> = {
  // Bread Options & Category
  bread: {
    src: '/icons/ingredients/bread.svg',
    label: 'Bread',
    emoji: '🥖',
  },
  toast: {
    src: '/icons/ingredients/toast.svg',
    label: 'Toast',
    emoji: '🍞',
  },
  paratha: {
    src: '/icons/ingredients/paratha.svg',
    label: 'Paratha',
    emoji: '🫓',
  },
  croissant: {
    src: '/icons/ingredients/croissant.svg',
    label: 'Croissant',
    emoji: '🥐',
  },

  // Egg Options & Category
  eggs: {
    src: '/icons/ingredients/eggs.svg',
    label: 'Eggs',
    emoji: '🥚',
  },
  egg: {
    src: '/icons/ingredients/egg.svg',
    label: 'Egg',
    emoji: '🥚',
  },
  fried: {
    src: '/icons/ingredients/fried.svg',
    label: 'Fried Egg',
    emoji: '🍳',
  },
  scrambled: {
    src: '/icons/ingredients/scrambled.svg',
    label: 'Scrambled Eggs',
    emoji: '🍳',
  },
  omelette: {
    src: '/icons/ingredients/omelette.svg',
    label: 'Omelette',
    emoji: '🥞',
  },

  // Protein Options & Category
  protein: {
    src: '/icons/ingredients/protein.svg',
    label: 'Protein',
    emoji: '🥩',
  },
  sausage: {
    src: '/icons/ingredients/sausage.svg',
    label: 'Chicken Sausage',
    emoji: '🌭',
  },
  bacon: {
    src: '/icons/ingredients/bacon.svg',
    label: 'Beef Bacon',
    emoji: '🥓',
  },
  tofu: {
    src: '/icons/ingredients/tofu.svg',
    label: 'Tofu',
    emoji: '🧈',
  },

  // Extras Options & Category
  extras: {
    src: '/icons/ingredients/extras.svg',
    label: 'Extras',
    emoji: '🥗',
  },
  hashbrown: {
    src: '/icons/ingredients/hashbrown.svg',
    label: 'Hash Brown',
    emoji: '🧇',
  },
  mushroom: {
    src: '/icons/ingredients/mushroom.svg',
    label: 'Mushroom',
    emoji: '🍄',
  },
  beans: {
    src: '/icons/ingredients/beans.svg',
    label: 'Baked Beans',
    emoji: '🫘',
  },
  cheese: {
    src: '/icons/ingredients/cheese.svg',
    label: 'Cheese',
    emoji: '🧀',
  },

  // Sauces Options & Category
  sauce: {
    src: '/icons/ingredients/sauce.svg',
    label: 'Sauce',
    emoji: '🥣',
  },
  ketchup: {
    src: '/icons/ingredients/ketchup.svg',
    label: 'Ketchup',
    emoji: '🍅',
  },
  hollandaise: {
    src: '/icons/ingredients/hollandaise.svg',
    label: 'Hollandaise Sauce',
    emoji: '🍮',
  },
  chili: {
    src: '/icons/ingredients/chili.svg',
    label: 'Chili Sauce',
    emoji: '🌶️',
  },
};

export interface IngredientIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  id: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBackground?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<IngredientIconProps['size']>, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-12 h-12',
};

export const IngredientIcon: React.FC<IngredientIconProps> = ({
  id,
  size = 'md',
  className = '',
  alt,
  showBackground = false,
  ...rest
}) => {
  const normalizedId = id.toLowerCase().trim();
  const meta = INGREDIENT_ICON_MAP[normalizedId];
  const [hasError, setHasError] = useState(false);

  // If item unknown or failed to load, fall back to native emoji or clean pill
  if (!meta) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block rounded-full bg-amber-400 ${SIZE_CLASSES[size]} ${className}`}
      />
    );
  }

  if (hasError) {
    return (
      <span
        role="img"
        aria-label={alt || meta.label}
        className={`inline-flex items-center justify-center select-none leading-none ${SIZE_CLASSES[size]} ${className}`}
      >
        {meta.emoji}
      </span>
    );
  }

  const imageElement = (
    <img
      src={meta.src}
      alt={alt || meta.label || `${id} icon`}
      onError={() => setHasError(true)}
      loading="lazy"
      decoding="async"
      className={`object-contain select-none shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    />
  );

  if (showBackground) {
    return (
      <div className="bg-amber-50/80 border border-amber-100 rounded-lg p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
        {imageElement}
      </div>
    );
  }

  return imageElement;
};
