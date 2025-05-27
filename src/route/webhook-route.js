import { Router } from "express";
import express from 'express';
import { webhookController } from "../controller/webhook-controller";

const webhookRouter = Router();

webhookRouter.post('/payment-webhook',express.raw({ type: 'application/json'}), webhookController);

export default webhookRouter;