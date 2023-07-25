const {StatusCodes} = require('http-status-codes');
const axios = require('axios');

const { BookingRepository } = require('../repositories');
const AppError = require('../utils/errors/app-error');
const db = require('../models');
const {ServerConfig}=require('../config')

const bookingRepository=new BookingRepository();

async function createBooking(data){
  
    const transaction = await db.sequelize.transaction();
    try {
        const flight = await axios.get(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`);
        const flightData = flight.data.data;
        if(data.noofSeats > flightData.totalSeats) {
            throw new AppError('Not enough seats available', StatusCodes.BAD_REQUEST);
        }
        const totalBillingAmount = data.noofSeats * flightData.price;
        const bookingPayload = {...data, totalCost: totalBillingAmount};

        //booking started
        const booking = await bookingRepository.createBooking(bookingPayload, transaction);

        //reduce seat number from flight
        await axios.patch(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`, {
            seats: data.noofSeats
        });
        await transaction.commit();
        return booking;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }

}


module.exports={
    createBooking,
}