import { Request, Response, NextFunction } from 'express';
import * as productsService from './products.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const products = await productsService.list(req.tenantId!, categoryId);
    res.json(products);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productsService.getById(req.tenantId!, req.params.id as string);
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productsService.create(req.tenantId!, req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productsService.update(req.tenantId!, req.params.id as string, req.body);
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await productsService.remove(req.tenantId!, req.params.id as string);
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    next(error);
  }
}

export async function toggleAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productsService.toggleAvailability(
      req.tenantId!,
      req.params.id as string,
      req.body.available,
    );
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    await productsService.reorder(req.tenantId!, req.body.ids);
    res.json({ message: 'Orden actualizado' });
  } catch (error) {
    next(error);
  }
}

export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { message: 'Imagen requerida', code: 'FILE_REQUIRED' } });
      return;
    }
    const product = await productsService.uploadImage(req.tenantId!, req.params.id as string, req.file.buffer);
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function getRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const recipe = await productsService.getRecipe(req.tenantId!, req.params.id as string);
    res.json(recipe);
  } catch (error) {
    next(error);
  }
}

export async function setRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const recipe = await productsService.setRecipe(req.tenantId!, req.params.id as string, req.body);
    res.json(recipe);
  } catch (error) {
    next(error);
  }
}

export async function deleteRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    await productsService.deleteRecipe(req.tenantId!, req.params.id as string);
    res.json({ message: 'Receta eliminada' });
  } catch (error) {
    next(error);
  }
}
