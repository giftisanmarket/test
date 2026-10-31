"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/lib/data';
import toast from 'react-hot-toast';
import { triggerHaptic } from '@/lib/native';
import { trackTikTokEvent } from '@/lib/tiktok-pixel';

interface CartItem extends Product {
  quantity: number;
  personalization?: string;
  customImage?: string;
  variantId?: string | null;
  variantName?: string | null;
  image?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any, personalization?: string, skipOpen?: boolean, customImage?: string) => void;
  removeFromCart: (productId: string, personalization?: string, variantId?: string | null, customImage?: string) => void;
  updateQuantity: (productId: string, quantity: number, personalization?: string, variantId?: string | null, customImage?: string) => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const normalizeString = (val?: string | null) => {
  if (!val) return null;
  const trimmed = String(val).trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isSameCartItem = (
  item: any,
  productId: string,
  personalization?: string | null,
  variantId?: string | null,
  customImage?: string | null
) => {
  return (
    item.id === productId &&
    normalizeString(item.personalization) === normalizeString(personalization) &&
    normalizeString(item.variantId) === normalizeString(variantId) &&
    normalizeString(item.customImage) === normalizeString(customImage)
  );
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount and deduplicate legacy duplicates
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('giftisan-cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          const deduplicated: CartItem[] = [];
          for (const item of parsed) {
            const existingIndex = deduplicated.findIndex((d) =>
              isSameCartItem(d, item.id, item.personalization, item.variantId, item.customImage)
            );
            if (existingIndex > -1) {
              const maxStock = typeof deduplicated[existingIndex].stock === 'number' ? deduplicated[existingIndex].stock : 999;
              deduplicated[existingIndex].quantity = Math.min(
                maxStock,
                (deduplicated[existingIndex].quantity || 1) + (item.quantity || 1)
              );
            } else {
              deduplicated.push({
                ...item,
                personalization: normalizeString(item.personalization) || undefined,
                variantId: normalizeString(item.variantId) || undefined,
                customImage: normalizeString(item.customImage) || undefined,
              });
            }
          }
          setCart(deduplicated);
        }
      }
    } catch (e) {
      console.error("Failed to parse cart from localStorage", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save cart to localStorage ONLY AFTER initialization
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('giftisan-cart', JSON.stringify(cart));
    }
  }, [cart, isInitialized]);

  const addToCart = (product: any, personalization?: string, skipOpen = false, customImage?: string) => {
    const itemCustomImage = normalizeString(customImage || product.customImage);
    const itemPersonalization = normalizeString(personalization || product.personalization);
    const itemVariantId = normalizeString(product.variantId);
    const maxStock = typeof product.stock === 'number' ? product.stock : 999;

    if (maxStock <= 0) {
      toast.error(
        typeof window !== 'undefined' && (document.dir === 'rtl' || document.documentElement.lang === 'ar')
          ? "عذراً، هذا المنتج غير متوفر حالياً بالمخزون."
          : "Sorry, this product is out of stock.",
        { id: "cart-stock-limit", style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' } }
      );
      return;
    }

    const existingItem = cart.find((item) =>
      isSameCartItem(item, product.id, itemPersonalization, itemVariantId, itemCustomImage)
    );

    if (existingItem && existingItem.quantity >= maxStock) {
      toast.error(
        typeof window !== 'undefined' && (document.dir === 'rtl' || document.documentElement.lang === 'ar')
          ? `وصلت للحد الأقصى للمخزون المتاح (${maxStock})`
          : `Maximum available stock reached (${maxStock})`,
        { id: "cart-stock-limit", style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' } }
      );
      if (!skipOpen) setIsCartOpen(true);
      return;
    }

    setCart((prevCart) => {
      const itemInPrev = prevCart.find((item) =>
        isSameCartItem(item, product.id, itemPersonalization, itemVariantId, itemCustomImage)
      );
      if (itemInPrev) {
        return prevCart.map((item) =>
          isSameCartItem(item, product.id, itemPersonalization, itemVariantId, itemCustomImage)
            ? { ...item, quantity: Math.min(maxStock, item.quantity + 1) }
            : item
        );
      }
      return [
        ...prevCart,
        {
          ...product,
          quantity: Math.min(1, maxStock),
          personalization: itemPersonalization || undefined,
          variantId: itemVariantId || undefined,
          customImage: itemCustomImage || undefined,
        },
      ];
    });
    triggerHaptic("medium");
    trackTikTokEvent('AddToCart', {
      content_id: String(product.id),
      content_type: 'product',
      content_name: product.name || product.title,
      quantity: 1,
      price: Number(product.price || 0),
      value: Number(product.price || 0),
      currency: 'EGP',
    });
    if (!skipOpen) setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, personalization?: string, variantId?: string | null, customImage?: string) => {
    triggerHaptic("light");
    setCart((prevCart) =>
      prevCart.filter((item) => !isSameCartItem(item, productId, personalization, variantId, customImage))
    );
  };

  const updateQuantity = (productId: string, quantity: number, personalization?: string, variantId?: string | null, customImage?: string) => {
    if (quantity < 1) return;
    triggerHaptic("light");

    const targetItem = cart.find((item) =>
      isSameCartItem(item, productId, personalization, variantId, customImage)
    );

    if (targetItem) {
      const maxStock = typeof targetItem.stock === 'number' ? targetItem.stock : 999;
      if (quantity > maxStock) {
        toast.error(
          typeof window !== 'undefined' && (document.dir === 'rtl' || document.documentElement.lang === 'ar')
            ? `الحد الأقصى للمخزون المتاح هو ${maxStock}`
            : `Maximum available stock reached (${maxStock})`,
          { id: "cart-stock-limit", style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' } }
        );
      }
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (isSameCartItem(item, productId, personalization, variantId, customImage)) {
          const maxStock = typeof item.stock === 'number' ? item.stock : 999;
          return { ...item, quantity: Math.min(quantity, maxStock) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
